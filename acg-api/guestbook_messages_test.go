package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

func openGuestbookMessageTestDB(t *testing.T) *sql.DB {
	t.Helper()
	testDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := migrateAll(testDB); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = testDB.Close() })
	return testDB
}

func withGuestbookTestDB(t *testing.T, fn func()) {
	t.Helper()
	t.Setenv("GUESTBOOK_MAIN_POSTS_ENABLED", "1")
	prev := db
	db = openGuestbookMessageTestDB(t)
	t.Cleanup(func() { db = prev })
	fn()
}

func decodeJSONMap(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return out
}

func seedGuestbookMessage(t *testing.T, body string, remoteAddr string) map[string]any {
	t.Helper()
	var parsed struct {
		Nickname string `json:"nickname"`
	}
	_ = json.Unmarshal([]byte(body), &parsed)
	displayName := strings.TrimSpace(parsed.Nickname)
	if displayName == "" {
		displayName = "Seed"
	}
	userID := seedGuestbookTestUser(t, "seed-"+uuid.NewString()+"@example.com", displayName, false)
	sessionToken := seedGuestbookTestSession(t, userID, false)
	rr := postGuestbookMessageWithSession(t, body, remoteAddr, sessionToken)
	if rr.Code != http.StatusOK {
		t.Fatalf("seed create failed: %d %s", rr.Code, rr.Body.String())
	}
	return decodeJSONMap(t, rr)
}

func seedGuestbookTestUser(t *testing.T, email, displayName string, isOwner bool) int64 {
	t.Helper()
	now := time.Now().UTC().Format(time.RFC3339)
	ownerFlag := 0
	if isOwner {
		ownerFlag = 1
	}
	res, err := db.Exec(
		`INSERT INTO users (email, display_name, password_hash, created_at, is_owner) VALUES (?, ?, 'hash', ?, ?)`,
		normalizeEmail(email),
		displayName,
		now,
		ownerFlag,
	)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("user last insert id: %v", err)
	}
	return id
}

func seedGuestbookTestSession(t *testing.T, userID int64, unlimited bool) string {
	t.Helper()
	token := uuid.NewString()
	unlimitedFlag := 0
	if unlimited {
		unlimitedFlag = 1
	}
	expires := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)
	if _, err := db.Exec(
		`INSERT INTO sessions (id, user_id, expires_at, unlimited) VALUES (?, ?, ?, ?)`,
		token,
		userID,
		expires,
		unlimitedFlag,
	); err != nil {
		t.Fatalf("insert session: %v", err)
	}
	return token
}

func postGuestbookMessageWithSession(t *testing.T, body, remoteAddr, sessionToken string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/guestbook/messages", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = remoteAddr
	if sessionToken != "" {
		req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionToken})
	}
	rr := httptest.NewRecorder()
	guestbookCreateHandler(rr, req)
	return rr
}

func guestbookStoredContactEmail(t *testing.T, id int64) string {
	t.Helper()
	var email string
	if err := db.QueryRow(`SELECT contact_email FROM guestbook_messages WHERE id = ?`, id).Scan(&email); err != nil {
		t.Fatalf("select contact_email: %v", err)
	}
	return email
}

type capturingGuestbookMailer struct {
	err      error
	messages []outboundMail
}

func (m *capturingGuestbookMailer) Send(message outboundMail) error {
	m.messages = append(m.messages, message)
	return m.err
}

func useGuestbookTestMailer(t *testing.T, mailer siteMailer) {
	t.Helper()
	prev := guestbookMailer
	guestbookMailer = mailer
	t.Cleanup(func() { guestbookMailer = prev })
}

func findMailTo(messages []outboundMail, to string) (outboundMail, bool) {
	for _, message := range messages {
		if strings.EqualFold(message.To, to) {
			return message, true
		}
	}
	return outboundMail{}, false
}

func TestGuestbookCreateAllowsVisitorTopLevelMessagesWithRequiredFields(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{
			name: "guestbook",
			body: `{"nickname":"Visitor","content":"plain guestbook","channel":"guestbook"}`,
		},
		{
			name: "friends",
			body: `{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":"visitor@example.com"}`,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			withGuestbookTestDB(t, func() {
				rr := postGuestbookMessageWithSession(t, tc.body, "127.0.0.1:3456", "")

				if rr.Code != http.StatusOK {
					t.Fatalf("expected 200 for visitor %s message, got %d body=%s", tc.name, rr.Code, rr.Body.String())
				}
				payload := decodeJSONMap(t, rr)
				item := payload["item"].(map[string]any)
				if item["isLoginUser"] != false {
					t.Fatalf("expected visitor marker, got %#v", item["isLoginUser"])
				}
				if count := guestbookMessageCount(t); count != 1 {
					t.Fatalf("visitor message should be stored once, found %d rows", count)
				}
			})
		})
	}
}

func TestGuestbookCreateBlocksMainGuestbookWhenDisabled(t *testing.T) {
	withGuestbookTestDB(t, func() {
		t.Setenv("GUESTBOOK_MAIN_POSTS_ENABLED", "0")

		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"kimi09test","content":"batch probe","channel":"guestbook"}`,
			"127.0.0.1:3456",
			"",
		)

		if rr.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 when main guestbook posts are disabled, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		if payload["error"] != "GUESTBOOK_DISABLED" {
			t.Fatalf("expected GUESTBOOK_DISABLED, got %#v", payload["error"])
		}
		if count := guestbookMessageCount(t); count != 0 {
			t.Fatalf("disabled main guestbook post should not be stored, found %d rows", count)
		}
	})
}

func TestGuestbookCreateAllowsFriendsChannelWhenMainGuestbookDisabled(t *testing.T) {
	withGuestbookTestDB(t, func() {
		t.Setenv("GUESTBOOK_MAIN_POSTS_ENABLED", "0")

		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":"visitor@example.com"}`,
			"127.0.0.1:3456",
			"",
		)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 for friends post while main guestbook is disabled, got %d body=%s", rr.Code, rr.Body.String())
		}
		if count := guestbookMessageCount(t); count != 1 {
			t.Fatalf("friends post should still be stored once, found %d rows", count)
		}
	})
}

func TestGuestbookCreateTopLevelMessage(t *testing.T) {
	withGuestbookTestDB(t, func() {
		payload := seedGuestbookMessage(t, `{"nickname":"Tao","content":"站点名称：A\n站点链接：https://a.test"}`, "127.0.0.1:3456")
		item := payload["item"].(map[string]any)
		if item["parentId"].(float64) != 0 {
			t.Fatalf("expected top-level parentId 0, got %#v", item["parentId"])
		}
	})
}

func TestFriendsVisitorTopLevelMessageRequiresContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"Friend","content":"friends root","channel":"friends"}`,
			"127.0.0.1:3456",
			"",
		)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for missing friends contact email, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		if payload["error"] != "INVALID_EMAIL" {
			t.Fatalf("expected INVALID_EMAIL, got %#v", payload["error"])
		}
	})
}

func TestFriendsVisitorTopLevelMessageStoresPrivateContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":" Visitor@Example.COM "}`,
			"127.0.0.1:3456",
			"",
		)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 for visitor friends contact email, got %d body=%s", rr.Code, rr.Body.String())
		}
		item := decodeJSONMap(t, rr)["item"].(map[string]any)
		id := int64(item["id"].(float64))

		if stored := guestbookStoredContactEmail(t, id); stored != "visitor@example.com" {
			t.Fatalf("expected normalized contact email, got %q", stored)
		}
		if item["isLoginUser"] != false {
			t.Fatalf("expected visitor marker, got %#v", item["isLoginUser"])
		}
		if _, ok := item["contactEmail"]; ok {
			t.Fatalf("public response leaked contactEmail: %#v", item)
		}
	})
}

func TestFriendsLoggedInTopLevelMessageStoresPrivateContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		payload := seedGuestbookMessage(t, `{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":" Visitor@Example.COM "}`, "127.0.0.1:3456")
		item := payload["item"].(map[string]any)
		id := int64(item["id"].(float64))

		if stored := guestbookStoredContactEmail(t, id); stored != "visitor@example.com" {
			t.Fatalf("expected normalized contact email, got %q", stored)
		}
		if _, ok := item["contactEmail"]; ok {
			t.Fatalf("public response leaked contactEmail: %#v", item)
		}
	})
}

func TestFriendsListDoesNotExposePrivateContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		seedGuestbookMessage(t, `{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":"visitor@example.com"}`, "127.0.0.1:3456")

		req := httptest.NewRequest(http.MethodGet, "/api/guestbook/messages?page=1&pageSize=20&channel=friends", nil)
		rr := httptest.NewRecorder()
		guestbookListHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		items := payload["items"].([]any)
		if len(items) != 1 {
			t.Fatalf("expected 1 friends item, got %d", len(items))
		}
		item := items[0].(map[string]any)
		if _, ok := item["contactEmail"]; ok {
			t.Fatalf("public list leaked contactEmail: %#v", item)
		}
	})
}

func TestFriendsLoggedInTopLevelMessageUsesSubmittedContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		userID := seedGuestbookTestUser(t, "login@example.com", "Login", false)
		sessionToken := seedGuestbookTestSession(t, userID, false)

		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"Preferred","content":"friends root","channel":"friends","contactEmail":"Preferred@Example.com"}`,
			"127.0.0.1:3456",
			sessionToken,
		)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		item := decodeJSONMap(t, rr)["item"].(map[string]any)
		id := int64(item["id"].(float64))

		if stored := guestbookStoredContactEmail(t, id); stored != "preferred@example.com" {
			t.Fatalf("expected submitted email override, got %q", stored)
		}
		if item["nickname"] != "Preferred" {
			t.Fatalf("expected submitted nickname, got %#v", item["nickname"])
		}
		if item["isLoginUser"] != true {
			t.Fatalf("expected logged-in marker to be preserved, got %#v", item["isLoginUser"])
		}
	})
}

func TestFriendsLoggedInTopLevelMessageRequiresSubmittedContactFields(t *testing.T) {
	withGuestbookTestDB(t, func() {
		userID := seedGuestbookTestUser(t, "Login@Example.com", "Login", false)
		sessionToken := seedGuestbookTestSession(t, userID, false)

		rr := postGuestbookMessageWithSession(
			t,
			`{"content":"friends root","channel":"friends"}`,
			"127.0.0.1:3456",
			sessionToken,
		)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for missing friends contact fields, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		if payload["error"] != "INVALID_NICKNAME" {
			t.Fatalf("expected INVALID_NICKNAME, got %#v", payload["error"])
		}
	})
}

func TestGuestbookChannelDoesNotRequireContactEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		payload := seedGuestbookMessage(t, `{"nickname":"Guestbook","content":"plain guestbook","channel":"guestbook"}`, "127.0.0.1:3456")
		item := payload["item"].(map[string]any)
		id := int64(item["id"].(float64))

		if stored := guestbookStoredContactEmail(t, id); stored != "" {
			t.Fatalf("expected empty contact email for generic guestbook, got %q", stored)
		}
	})
}

func TestGuestbookCreateSendsOwnerNotificationEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		t.Setenv("MAIL_NOTIFY_TO", "owner-notify@example.com")
		mailer := &capturingGuestbookMailer{}
		useGuestbookTestMailer(t, mailer)

		seedGuestbookMessage(t, `{"nickname":"Guestbook","content":"please read this","channel":"guestbook"}`, "127.0.0.1:3456")

		message, ok := findMailTo(mailer.messages, "owner-notify@example.com")
		if !ok {
			t.Fatalf("expected owner notification email, got %#v", mailer.messages)
		}
		if !strings.Contains(message.Subject, "新的留言") {
			t.Fatalf("expected Chinese owner notification subject, got %q", message.Subject)
		}
		if !strings.Contains(message.Body, "留言人：Guestbook") || !strings.Contains(message.Body, "please read this") {
			t.Fatalf("expected body to include message content, got %q", message.Body)
		}
	})
}

func TestOwnerReplySendsParentContactEmailNotification(t *testing.T) {
	withGuestbookTestDB(t, func() {
		t.Setenv("MAIL_NOTIFY_TO", "owner-notify@example.com")
		parent := seedGuestbookMessage(t, `{"nickname":"Friend","content":"friend request","channel":"friends","contactEmail":"visitor@example.com"}`, "127.0.0.1:3456")
		parentID := int64(parent["item"].(map[string]any)["id"].(float64))

		ownerID := seedGuestbookTestUser(t, "owner@example.com", "Owner", true)
		sessionToken := seedGuestbookTestSession(t, ownerID, true)
		mailer := &capturingGuestbookMailer{}
		useGuestbookTestMailer(t, mailer)

		rr := postGuestbookMessageWithSession(
			t,
			`{"content":"owner reply","channel":"friends","parentId":`+strconv.FormatInt(parentID, 10)+`}`,
			"127.0.0.1:4567",
			sessionToken,
		)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}

		message, ok := findMailTo(mailer.messages, "visitor@example.com")
		if !ok {
			t.Fatalf("expected reply notification to visitor, got %#v", mailer.messages)
		}
		if !strings.Contains(message.Subject, "收到回复") || !strings.Contains(message.Body, "owner reply") {
			t.Fatalf("expected reply subject/body, got subject=%q body=%q", message.Subject, message.Body)
		}
	})
}

func TestOwnerReplyFallsBackToParentUserAccountEmail(t *testing.T) {
	withGuestbookTestDB(t, func() {
		userID := seedGuestbookTestUser(t, "member@example.com", "Member", false)
		now := time.Now().UTC().Format(time.RFC3339)
		res, err := db.Exec(
			`INSERT INTO guestbook_messages
			 (user_id, nickname, avatar, channel, content, contact_email, content_hash, ip_hash, ip_region, ip_masked, user_agent_hash, parent_id, status, is_login_user, is_admin_user, created_at, updated_at)
			 VALUES (?, 'Member', '', 'friends', 'member request', '', 'content-hash', 'ip-hash', '', '', '', 0, 'visible', 1, 0, ?, ?)`,
			userID,
			now,
			now,
		)
		if err != nil {
			t.Fatalf("insert parent message: %v", err)
		}
		parentID, err := res.LastInsertId()
		if err != nil {
			t.Fatalf("parent last insert id: %v", err)
		}
		ownerID := seedGuestbookTestUser(t, "owner@example.com", "Owner", true)
		sessionToken := seedGuestbookTestSession(t, ownerID, true)
		mailer := &capturingGuestbookMailer{}
		useGuestbookTestMailer(t, mailer)

		rr := postGuestbookMessageWithSession(
			t,
			`{"content":"owner reply","channel":"friends","parentId":`+strconv.FormatInt(parentID, 10)+`}`,
			"127.0.0.1:4567",
			sessionToken,
		)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}

		if _, ok := findMailTo(mailer.messages, "member@example.com"); !ok {
			t.Fatalf("expected reply notification to parent account email, got %#v", mailer.messages)
		}
	})
}

func TestGuestbookMailFailureDoesNotFailMessageCreation(t *testing.T) {
	withGuestbookTestDB(t, func() {
		t.Setenv("MAIL_NOTIFY_TO", "owner-notify@example.com")
		mailer := &capturingGuestbookMailer{err: errors.New("smtp unavailable")}
		useGuestbookTestMailer(t, mailer)
		userID := seedGuestbookTestUser(t, "guestbook@example.com", "Guestbook", false)
		sessionToken := seedGuestbookTestSession(t, userID, false)

		rr := postGuestbookMessageWithSession(
			t,
			`{"nickname":"Guestbook","content":"mail can fail","channel":"guestbook"}`,
			"127.0.0.1:3456",
			sessionToken,
		)

		if rr.Code != http.StatusOK {
			t.Fatalf("mail failure should not fail message creation, got %d body=%s", rr.Code, rr.Body.String())
		}
		if len(mailer.messages) != 1 {
			t.Fatalf("expected attempted owner notification, got %#v", mailer.messages)
		}
	})
}

func TestGuestbookChannelKeepsGuestbookAndFriendsSeparate(t *testing.T) {
	withGuestbookTestDB(t, func() {
		seedGuestbookMessage(t, `{"nickname":"Guestbook","content":"only guestbook"}`, "127.0.0.1:3456")
		seedGuestbookMessage(t, `{"nickname":"Friend","content":"only friends","channel":"friends","contactEmail":"friend@example.com"}`, "127.0.0.1:4567")

		guestbookReq := httptest.NewRequest(http.MethodGet, "/api/guestbook/messages?page=1&pageSize=20&channel=guestbook", nil)
		guestbookRR := httptest.NewRecorder()
		guestbookListHandler(guestbookRR, guestbookReq)
		if guestbookRR.Code != http.StatusOK {
			t.Fatalf("guestbook list expected 200, got %d body=%s", guestbookRR.Code, guestbookRR.Body.String())
		}
		guestbookPayload := decodeJSONMap(t, guestbookRR)
		guestbookItems := guestbookPayload["items"].([]any)
		if len(guestbookItems) != 1 {
			t.Fatalf("expected 1 guestbook item, got %d", len(guestbookItems))
		}

		friendsReq := httptest.NewRequest(http.MethodGet, "/api/guestbook/messages?page=1&pageSize=20&channel=friends", nil)
		friendsRR := httptest.NewRecorder()
		guestbookListHandler(friendsRR, friendsReq)
		if friendsRR.Code != http.StatusOK {
			t.Fatalf("friends list expected 200, got %d body=%s", friendsRR.Code, friendsRR.Body.String())
		}
		friendsPayload := decodeJSONMap(t, friendsRR)
		friendsItems := friendsPayload["items"].([]any)
		if len(friendsItems) != 1 {
			t.Fatalf("expected 1 friends item, got %d", len(friendsItems))
		}
	})
}

func TestGuestbookRejectsReplyAcrossChannels(t *testing.T) {
	withGuestbookTestDB(t, func() {
		first := seedGuestbookMessage(t, `{"nickname":"Friend","content":"friends root","channel":"friends","contactEmail":"friend@example.com"}`, "127.0.0.1:3456")
		parentID := int(first["item"].(map[string]any)["id"].(float64))
		userID := seedGuestbookTestUser(t, "reply@example.com", "Reply", false)
		sessionToken := seedGuestbookTestSession(t, userID, false)

		req := httptest.NewRequest(
			http.MethodPost,
			"/api/guestbook/messages",
			bytes.NewBufferString(`{"nickname":"Reply","content":"cross reply","parentId":1,"channel":"guestbook"}`),
		)
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "127.0.0.1:4567"
		req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionToken})
		rr := httptest.NewRecorder()

		guestbookCreateHandler(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for cross-channel reply to %d, got %d body=%s", parentID, rr.Code, rr.Body.String())
		}
	})
}

func TestGuestbookCreateReplyWithParentID(t *testing.T) {
	withGuestbookTestDB(t, func() {
		first := seedGuestbookMessage(t, `{"nickname":"Tao","content":"站点名称：A\n站点链接：https://a.test"}`, "127.0.0.1:3456")
		parentID := int(first["item"].(map[string]any)["id"].(float64))

		replyBody := `{"nickname":"Reply","content":"已看到，晚点回链。","parentId":1}`
		payload := seedGuestbookMessage(t, replyBody, "127.0.0.1:4567")
		item := payload["item"].(map[string]any)
		if int(item["parentId"].(float64)) != parentID {
			t.Fatalf("expected parentId %d, got %#v", parentID, item["parentId"])
		}
	})
}

func TestGuestbookRejectsReplyToMissingParent(t *testing.T) {
	withGuestbookTestDB(t, func() {
		userID := seedGuestbookTestUser(t, "reply@example.com", "Reply", false)
		sessionToken := seedGuestbookTestSession(t, userID, false)
		req := httptest.NewRequest(
			http.MethodPost,
			"/api/guestbook/messages",
			bytes.NewBufferString(`{"nickname":"Reply","content":"找不到楼层","parentId":999}`),
		)
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "127.0.0.1:5678"
		req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: sessionToken})
		rr := httptest.NewRecorder()

		guestbookCreateHandler(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
		}
	})
}

func TestGuestbookListReturnsNestedReplies(t *testing.T) {
	withGuestbookTestDB(t, func() {
		seedGuestbookMessage(t, `{"nickname":"Tao","content":"站点名称：A\n站点链接：https://a.test"}`, "127.0.0.1:3456")
		seedGuestbookMessage(t, `{"nickname":"Friend","content":"已添加，来回访啦。","parentId":1}`, "127.0.0.1:4567")

		req := httptest.NewRequest(http.MethodGet, "/api/guestbook/messages?page=1&pageSize=20", nil)
		rr := httptest.NewRecorder()
		guestbookListHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		items := payload["items"].([]any)
		if len(items) != 1 {
			t.Fatalf("expected 1 top-level item, got %d", len(items))
		}
		top := items[0].(map[string]any)
		if int(top["replyCount"].(float64)) != 1 {
			t.Fatalf("expected replyCount 1, got %#v", top["replyCount"])
		}
		replies := top["replies"].([]any)
		if len(replies) != 1 {
			t.Fatalf("expected 1 reply, got %d", len(replies))
		}
	})
}

func TestGuestbookListReturnsMultiLevelReplyTree(t *testing.T) {
	withGuestbookTestDB(t, func() {
		top := seedGuestbookMessage(t, `{"nickname":"Top","content":"root thread","channel":"friends","contactEmail":"top@example.com"}`, "127.0.0.1:3456")
		topID := int64(top["item"].(map[string]any)["id"].(float64))
		first := seedGuestbookMessage(t, `{"nickname":"First","content":"first reply","channel":"friends","parentId":`+strconv.FormatInt(topID, 10)+`}`, "127.0.0.1:4567")
		firstID := int64(first["item"].(map[string]any)["id"].(float64))
		seedGuestbookMessage(t, `{"nickname":"Second","content":"second reply","channel":"friends","parentId":`+strconv.FormatInt(firstID, 10)+`}`, "127.0.0.1:5678")

		req := httptest.NewRequest(http.MethodGet, "/api/guestbook/messages?page=1&pageSize=20&channel=friends", nil)
		rr := httptest.NewRecorder()

		guestbookListHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		payload := decodeJSONMap(t, rr)
		items := payload["items"].([]any)
		if len(items) != 1 {
			t.Fatalf("expected 1 top-level item, got %d", len(items))
		}
		root := items[0].(map[string]any)
		if int64(root["id"].(float64)) != topID {
			t.Fatalf("expected root id %d, got %#v", topID, root["id"])
		}
		if int(root["replyCount"].(float64)) != 2 {
			t.Fatalf("expected total replyCount 2, got %#v", root["replyCount"])
		}
		replies := root["replies"].([]any)
		if len(replies) != 1 {
			t.Fatalf("expected one direct reply, got %d", len(replies))
		}
		firstReply := replies[0].(map[string]any)
		if int64(firstReply["id"].(float64)) != firstID {
			t.Fatalf("expected first reply id %d, got %#v", firstID, firstReply["id"])
		}
		nested := firstReply["replies"].([]any)
		if len(nested) != 1 {
			t.Fatalf("expected one nested reply, got %d", len(nested))
		}
		if nested[0].(map[string]any)["content"] != "second reply" {
			t.Fatalf("expected nested reply content, got %#v", nested[0])
		}
	})
}
