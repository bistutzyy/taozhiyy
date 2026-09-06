package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	guestbookNickMax     = 12
	guestbookContentMax  = 300
	guestbookDupWindow   = 60 * time.Second
	guestbookChannelMain = "guestbook"
	guestbookChannelLink = "friends"
)

type guestbookMessageRow struct {
	ID            int64                 `json:"id"`
	ParentID      int64                 `json:"parentId"`
	Nickname      string                `json:"nickname"`
	Avatar        string                `json:"avatar"`
	Content       string                `json:"content"`
	IPRegion      string                `json:"ipRegion"`
	CreatedAt     string                `json:"createdAt"`
	IsLoginUser   bool                  `json:"isLoginUser"`
	IsAdminUser   bool                  `json:"isAdminUser,omitempty"`
	Status        string                `json:"status,omitempty"`
	IPMasked      string                `json:"ipMasked,omitempty"`
	UserAgentHash string                `json:"userAgentHash,omitempty"`
	ReplyCount    int                   `json:"replyCount,omitempty"`
	Replies       []guestbookMessageRow `json:"replies,omitempty"`
}

func guestbookRouter(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/guestbook/")
	if path == "messages" || path == "messages/" {
		switch r.Method {
		case http.MethodGet:
			guestbookListHandler(w, r)
		case http.MethodPost:
			guestbookCreateHandler(w, r)
		default:
			methodNotAllowed(w)
		}
		return
	}
	if strings.HasPrefix(path, "messages/") {
		rest := strings.TrimPrefix(path, "messages/")
		rest = strings.TrimSuffix(rest, "/")
		idStr := rest
		if strings.HasSuffix(idStr, "/status") {
			idStr = strings.TrimSuffix(idStr, "/status")
			id, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil || id <= 0 {
				writeGuestbookErr(w, http.StatusNotFound, "NOT_FOUND", "留言不存在")
				return
			}
			if r.Method == http.MethodPatch {
				guestbookPatchStatusHandler(w, r, id)
			} else {
				methodNotAllowed(w)
			}
			return
		}
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			writeGuestbookErr(w, http.StatusNotFound, "NOT_FOUND", "留言不存在")
			return
		}
		switch r.Method {
		case http.MethodDelete:
			guestbookDeleteHandler(w, r, id)
		case http.MethodPatch:
			guestbookPatchStatusHandler(w, r, id)
		default:
			methodNotAllowed(w)
		}
		return
	}
	http.NotFound(w, r)
}

func writeGuestbookErr(w http.ResponseWriter, status int, code, msg string) {
	writeJSONStatus(w, status, map[string]any{"error": code, "message": msg})
}

func normalizeGuestbookChannel(raw string) string {
	switch strings.TrimSpace(raw) {
	case "", guestbookChannelMain:
		return guestbookChannelMain
	case guestbookChannelLink:
		return guestbookChannelLink
	default:
		return ""
	}
}

func mainGuestbookPostsDisabled() bool {
	return !guestbookEnvEnabled(os.Getenv("GUESTBOOK_MAIN_POSTS_ENABLED"))
}

func guestbookEnvEnabled(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on", "enabled":
		return true
	default:
		return false
	}
}

func guestbookListHandler(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 20
	channel := normalizeGuestbookChannel(r.URL.Query().Get("channel"))
	if channel == "" {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_CHANNEL", "留言分区不正确")
		return
	}
	if v := r.URL.Query().Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := r.URL.Query().Get("pageSize"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			pageSize = n
		}
	}
	offset := (page - 1) * pageSize
	cu := getCurrentUserFromRequest(r)
	admin := isAdminUser(cu)

	var total int
	countQ := `SELECT COUNT(*) FROM guestbook_messages WHERE channel = ? AND parent_id = 0 AND status = 'visible'`
	listQ := `SELECT id, parent_id, user_id, nickname, avatar, content, ip_region, is_login_user, is_admin_user, status, ip_masked, user_agent_hash, created_at
	          FROM guestbook_messages WHERE channel = ? AND parent_id = 0 AND status = 'visible'`
	if admin {
		countQ = `SELECT COUNT(*) FROM guestbook_messages WHERE channel = ? AND parent_id = 0 AND status IN ('visible','hidden')`
		listQ = `SELECT id, parent_id, user_id, nickname, avatar, content, ip_region, is_login_user, is_admin_user, status, ip_masked, user_agent_hash, created_at
		         FROM guestbook_messages WHERE channel = ? AND parent_id = 0 AND status IN ('visible','hidden')`
	}
	if err := db.QueryRow(countQ, channel).Scan(&total); err != nil {
		writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "加载留言失败")
		return
	}
	rows, err := db.Query(listQ+` ORDER BY id DESC LIMIT ? OFFSET ?`, channel, pageSize, offset)
	if err != nil {
		writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "加载留言失败")
		return
	}
	defer rows.Close()

	items := make([]guestbookMessageRow, 0)
	parentIDs := make([]int64, 0, pageSize)
	for rows.Next() {
		item, err := scanGuestbookRow(rows, admin)
		if err != nil {
			writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "加载留言失败")
			return
		}
		items = append(items, item)
		parentIDs = append(parentIDs, item.ID)
	}
	if len(parentIDs) > 0 {
		replyMap, err := loadGuestbookReplyTree(parentIDs, admin, channel)
		if err != nil {
			writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "加载留言失败")
			return
		}
		for i := range items {
			attachGuestbookReplyTree(&items[i], replyMap)
		}
	}

	writeJSON(w, map[string]any{
		"items":    items,
		"page":     page,
		"pageSize": pageSize,
		"total":    total,
		"channel":  channel,
		"isAdmin":  admin,
	})
}

func scanGuestbookRow(rows *sql.Rows, admin bool) (guestbookMessageRow, error) {
	var item guestbookMessageRow
	var userID sql.NullInt64
	var avatar, ipMasked, uaHash sql.NullString
	var isLogin, isAdmin int
	var status string
	var created string
	err := rows.Scan(
		&item.ID, &item.ParentID, &userID, &item.Nickname, &avatar, &item.Content, &item.IPRegion,
		&isLogin, &isAdmin, &status, &ipMasked, &uaHash, &created,
	)
	if err != nil {
		return item, err
	}
	item.Avatar = avatar.String
	item.IsLoginUser = isLogin == 1
	item.IsAdminUser = isAdmin == 1
	item.CreatedAt = formatGuestbookTime(created)
	if admin {
		item.Status = status
		item.IPMasked = ipMasked.String
		item.UserAgentHash = uaHash.String
	}
	return item, nil
}

func loadGuestbookReplies(parentIDs []int64, admin bool, channel string) ([]guestbookMessageRow, error) {
	placeholders := make([]string, 0, len(parentIDs))
	args := make([]any, 0, len(parentIDs)+1)
	args = append(args, channel)
	for _, id := range parentIDs {
		placeholders = append(placeholders, "?")
		args = append(args, id)
	}

	listQ := `SELECT id, parent_id, user_id, nickname, avatar, content, ip_region, is_login_user, is_admin_user, status, ip_masked, user_agent_hash, created_at
	          FROM guestbook_messages WHERE channel = ? AND parent_id IN (` + strings.Join(placeholders, ",") + `) AND status = 'visible'`
	if admin {
		listQ = `SELECT id, parent_id, user_id, nickname, avatar, content, ip_region, is_login_user, is_admin_user, status, ip_masked, user_agent_hash, created_at
		         FROM guestbook_messages WHERE channel = ? AND parent_id IN (` + strings.Join(placeholders, ",") + `) AND status IN ('visible','hidden')`
	}

	rows, err := db.Query(listQ+` ORDER BY id ASC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	replies := make([]guestbookMessageRow, 0)
	for rows.Next() {
		item, err := scanGuestbookRow(rows, admin)
		if err != nil {
			return nil, err
		}
		replies = append(replies, item)
	}
	return replies, nil
}

func loadGuestbookReplyTree(parentIDs []int64, admin bool, channel string) (map[int64][]guestbookMessageRow, error) {
	replyMap := make(map[int64][]guestbookMessageRow)
	pending := append([]int64(nil), parentIDs...)
	visited := make(map[int64]bool, len(parentIDs))

	for len(pending) > 0 {
		currentParents := make([]int64, 0, len(pending))
		nextParents := make([]int64, 0)
		for _, id := range pending {
			if id <= 0 || visited[id] {
				continue
			}
			visited[id] = true
			currentParents = append(currentParents, id)
		}
		if len(currentParents) == 0 {
			break
		}

		replies, err := loadGuestbookReplies(currentParents, admin, channel)
		if err != nil {
			return nil, err
		}
		for _, reply := range replies {
			replyMap[reply.ParentID] = append(replyMap[reply.ParentID], reply)
			nextParents = append(nextParents, reply.ID)
		}
		pending = nextParents
	}

	return replyMap, nil
}

func attachGuestbookReplyTree(item *guestbookMessageRow, replyMap map[int64][]guestbookMessageRow) int {
	replies := replyMap[item.ID]
	if len(replies) == 0 {
		return 0
	}

	item.Replies = make([]guestbookMessageRow, len(replies))
	copy(item.Replies, replies)

	total := 0
	for i := range item.Replies {
		total += 1 + attachGuestbookReplyTree(&item.Replies[i], replyMap)
	}
	item.ReplyCount = total
	return total
}

func guestbookCreateHandler(w http.ResponseWriter, r *http.Request) {
	cu := getCurrentUserFromRequest(r)
	var body struct {
		Nickname     string `json:"nickname"`
		Content      string `json:"content"`
		ContactEmail string `json:"contactEmail"`
		ParentID     int64  `json:"parentId"`
		Channel      string `json:"channel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_JSON", "请求格式不正确")
		return
	}
	channel := normalizeGuestbookChannel(body.Channel)
	if channel == "" {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_CHANNEL", "留言分区不正确")
		return
	}
	if channel == guestbookChannelMain && mainGuestbookPostsDisabled() {
		writeGuestbookErr(w, http.StatusServiceUnavailable, "GUESTBOOK_DISABLED", "留言区暂时维护中，已暂停提交。")
		return
	}
	content := strings.TrimSpace(body.Content)
	if guestbookLooksUnsafe(content) {
		writeGuestbookErr(w, http.StatusBadRequest, "UNSAFE_CONTENT", "留言不能包含脚本、HTML 标签或可执行链接")
		return
	}
	if content == "" {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_CONTENT", "留言内容不能为空")
		return
	}
	if utf8.RuneCountInString(content) > guestbookContentMax {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_CONTENT", "留言最多 300 字哦")
		return
	}
	if body.ParentID < 0 {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_PARENT", "回复楼层不正确")
		return
	}
	if body.ParentID > 0 && !guestbookParentExists(body.ParentID, isAdminUser(cu), channel) {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_PARENT", "要回复的留言不存在或不可见")
		return
	}

	var (
		nickname     string
		avatar       string
		contactEmail string
		userID       sql.NullInt64
		isLogin      int
		isAdminUser  int
	)
	if cu != nil {
		avatar = cu.Avatar
		userID = sql.NullInt64{Int64: cu.ID, Valid: true}
		isLogin = 1
		if cu.Role == "admin" {
			isAdminUser = 1
		}
	}
	if body.ParentID == 0 && channel == guestbookChannelLink {
		nickname = strings.TrimSpace(body.Nickname)
		if guestbookLooksUnsafe(nickname) {
			writeGuestbookErr(w, http.StatusBadRequest, "UNSAFE_CONTENT", "昵称不能包含脚本或 HTML 标签")
			return
		}
		if nickname == "" {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_NICKNAME", "请给自己取个名字呀")
			return
		}
		if utf8.RuneCountInString(nickname) > guestbookNickMax {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_NICKNAME", "昵称最多 12 个字哦")
			return
		}
		submittedEmail := normalizeEmail(body.ContactEmail)
		if submittedEmail == "" {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_EMAIL", "请留下邮箱，方便收到回复通知")
			return
		}
		if !validateEmail(submittedEmail) {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_EMAIL", "请输入有效的邮箱地址")
			return
		}
		contactEmail = submittedEmail
	} else if cu == nil {
		nickname = strings.TrimSpace(body.Nickname)
		if guestbookLooksUnsafe(nickname) {
			writeGuestbookErr(w, http.StatusBadRequest, "UNSAFE_CONTENT", "昵称不能包含脚本或 HTML 标签")
			return
		}
		if nickname == "" {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_NICKNAME", "请给自己取个名字呀")
			return
		}
		if utf8.RuneCountInString(nickname) > guestbookNickMax {
			writeGuestbookErr(w, http.StatusBadRequest, "INVALID_NICKNAME", "昵称最多 12 个字哦")
			return
		}
	} else {
		nickname = cu.Nickname
	}
	if guestbookLooksUnsafe(nickname) {
		writeGuestbookErr(w, http.StatusBadRequest, "UNSAFE_CONTENT", "昵称不能包含脚本或 HTML 标签")
		return
	}

	ip := clientIP(r)
	ipHash := hashKey("ip", ip)
	ua := r.UserAgent()
	uaHash := hashKey("ua", ua)
	contentHash := hashKey("content", content)

	if err := guestbookCheckRateLimit(cu, ipHash, uaHash); err != nil {
		writeGuestbookErr(w, http.StatusTooManyRequests, "RATE_LIMITED", err.Error())
		return
	}
	if guestbookIsDuplicate(cu, ipHash, contentHash, time.Now().UTC().Add(-guestbookDupWindow).Format(time.RFC3339)) {
		writeGuestbookErr(w, http.StatusTooManyRequests, "RATE_LIMITED", "相同内容提交太快啦，稍后再试试～")
		return
	}

	ipRegion := lookupIPRegion(db, ip, ipHash)
	ipMasked := maskIP(ip)
	now := time.Now().UTC().Format(time.RFC3339)

	res, err := db.Exec(
		`INSERT INTO guestbook_messages
		 (user_id, nickname, avatar, channel, content, contact_email, content_hash, ip_hash, ip_region, ip_masked, user_agent_hash, parent_id, status, is_login_user, is_admin_user, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'visible', ?, ?, ?, ?)`,
		userID, nickname, avatar, channel, content, contactEmail, contentHash, ipHash, ipRegion, ipMasked, uaHash,
		body.ParentID, isLogin, isAdminUser, now, now,
	)
	if err != nil {
		writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "小纸条没有贴上，请稍后再试哦")
		return
	}
	id, _ := res.LastInsertId()
	item := guestbookMessageRow{
		ID:          id,
		ParentID:    body.ParentID,
		Nickname:    nickname,
		Avatar:      avatar,
		Content:     content,
		IPRegion:    ipRegion,
		CreatedAt:   formatGuestbookTime(now),
		IsLoginUser: isLogin == 1,
		IsAdminUser: isAdminUser == 1,
		Status:      "visible",
	}
	notifyGuestbookMessageCreated(item, channel, now)
	writeJSON(w, map[string]any{
		"message": "留言成功",
		"item":    item,
	})
}

func notifyGuestbookMessageCreated(item guestbookMessageRow, channel, createdAt string) {
	if err := sendGuestbookOwnerNotification(item, channel, createdAt); err != nil {
		logGuestbookMailError("owner notification", err)
	}
	if item.ParentID > 0 && item.IsAdminUser {
		if err := sendGuestbookReplyNotification(item, channel, createdAt); err != nil {
			logGuestbookMailError("reply notification", err)
		}
	}
}

func sendGuestbookOwnerNotification(item guestbookMessageRow, channel, createdAt string) error {
	to := normalizeEmail(env("MAIL_NOTIFY_TO", ""))
	if to == "" || !validateEmail(to) {
		return nil
	}
	return sendGuestbookMail(outboundMail{
		To:      to,
		Subject: guestbookOwnerMailSubject(channel, item.ParentID > 0),
		Body:    guestbookOwnerMailBody(item, channel, createdAt),
	})
}

func sendGuestbookReplyNotification(item guestbookMessageRow, channel, createdAt string) error {
	to := guestbookReplyRecipientEmail(item.ParentID)
	if to == "" || !validateEmail(to) {
		return nil
	}
	if strings.EqualFold(to, normalizeEmail(env("SMTP_USER", ""))) {
		return nil
	}
	return sendGuestbookMail(outboundMail{
		To:      to,
		Subject: "桃之夭夭：你的留言收到回复",
		Body:    guestbookReplyMailBody(item, channel, createdAt),
	})
}

func guestbookReplyRecipientEmail(parentID int64) string {
	if parentID <= 0 {
		return ""
	}
	var contactEmail string
	var userID sql.NullInt64
	if err := db.QueryRow(
		`SELECT contact_email, user_id FROM guestbook_messages WHERE id = ? AND status != 'deleted'`,
		parentID,
	).Scan(&contactEmail, &userID); err != nil {
		return ""
	}
	if email := normalizeEmail(contactEmail); email != "" {
		return email
	}
	if !userID.Valid {
		return ""
	}
	var email string
	if err := db.QueryRow(`SELECT email FROM users WHERE id = ?`, userID.Int64).Scan(&email); err != nil {
		return ""
	}
	return normalizeEmail(email)
}

func guestbookOwnerMailSubject(channel string, reply bool) string {
	if reply {
		if channel == guestbookChannelLink {
			return "桃之夭夭：友链留言有新回复"
		}
		return "桃之夭夭：留言有新回复"
	}
	if channel == guestbookChannelLink {
		return "桃之夭夭：新的友链留言"
	}
	return "桃之夭夭：新的留言"
}

func guestbookOwnerMailBody(item guestbookMessageRow, channel, createdAt string) string {
	return strings.Join([]string{
		"桃之夭夭有新的留言通知。",
		"",
		"留言位置：" + guestbookChannelName(channel),
		"留言人：" + item.Nickname,
		"留言时间：" + createdAt,
		"",
		"留言内容：",
		item.Content,
		"",
		"查看地址：" + guestbookChannelURL(channel),
	}, "\n")
}

func guestbookReplyMailBody(item guestbookMessageRow, channel, createdAt string) string {
	return strings.Join([]string{
		"你在桃之夭夭留下的留言收到了一条回复。",
		"",
		"留言位置：" + guestbookChannelName(channel),
		"回复时间：" + createdAt,
		"",
		"回复内容：",
		item.Content,
		"",
		"查看地址：" + guestbookChannelURL(channel),
	}, "\n")
}

func guestbookChannelName(channel string) string {
	switch channel {
	case guestbookChannelLink:
		return "友链留言"
	default:
		return "留言区"
	}
}

func guestbookChannelURL(channel string) string {
	switch channel {
	case guestbookChannelLink:
		return "https://taozhiyy.top/friends"
	default:
		return "https://taozhiyy.top/guestbook"
	}
}

func guestbookParentExists(parentID int64, admin bool, channel string) bool {
	if parentID <= 0 {
		return true
	}
	var count int
	query := `SELECT COUNT(*) FROM guestbook_messages WHERE id = ? AND channel = ? AND status = 'visible'`
	if admin {
		query = `SELECT COUNT(*) FROM guestbook_messages WHERE id = ? AND channel = ? AND status IN ('visible','hidden')`
	}
	_ = db.QueryRow(query, parentID, channel).Scan(&count)
	return count > 0
}

func guestbookCheckRateLimit(cu *currentUser, ipHash, uaHash string) error {
	now := time.Now().UTC()
	hourAgo := now.Add(-time.Hour).Format(time.RFC3339)
	dayStart := now.Format("2006-01-02") + "T00:00:00Z"

	var hourLimit, dayLimit int
	var hourCount, dayCount int
	var err error

	if cu != nil {
		hourLimit, dayLimit = 10, 30
		err = db.QueryRow(
			`SELECT
			  (SELECT COUNT(*) FROM guestbook_messages WHERE user_id = ? AND created_at >= ?),
			  (SELECT COUNT(*) FROM guestbook_messages WHERE user_id = ? AND created_at >= ?)`,
			cu.ID, hourAgo, cu.ID, dayStart,
		).Scan(&hourCount, &dayCount)
	} else {
		hourLimit, dayLimit = 3, 10
		err = db.QueryRow(
			`SELECT
			  (SELECT COUNT(*) FROM guestbook_messages WHERE ip_hash = ? AND user_agent_hash = ? AND is_login_user = 0 AND created_at >= ?),
			  (SELECT COUNT(*) FROM guestbook_messages WHERE ip_hash = ? AND user_agent_hash = ? AND is_login_user = 0 AND created_at >= ?)`,
			ipHash, uaHash, hourAgo, ipHash, uaHash, dayStart,
		).Scan(&hourCount, &dayCount)
	}
	if err != nil {
		return nil
	}
	if hourCount >= hourLimit || dayCount >= dayLimit {
		return errGuestbookRateLimited
	}
	return nil
}

var errGuestbookRateLimited = &guestbookErr{msg: "留言太频繁啦，稍后再来贴小纸条吧～"}

type guestbookErr struct{ msg string }

func (e *guestbookErr) Error() string { return e.msg }

func guestbookIsDuplicate(cu *currentUser, ipHash, contentHash, since string) bool {
	if cu != nil {
		var n int
		_ = db.QueryRow(
			`SELECT COUNT(*) FROM guestbook_messages WHERE user_id = ? AND content_hash = ? AND created_at >= ?`,
			cu.ID, contentHash, since,
		).Scan(&n)
		return n > 0
	}
	var n int
	_ = db.QueryRow(
		`SELECT COUNT(*) FROM guestbook_messages WHERE ip_hash = ? AND content_hash = ? AND is_login_user = 0 AND created_at >= ?`,
		ipHash, contentHash, since,
	).Scan(&n)
	return n > 0
}

func guestbookDeleteHandler(w http.ResponseWriter, r *http.Request, id int64) {
	cu := getCurrentUserFromRequest(r)
	if !isAdminUser(cu) {
		writeGuestbookErr(w, http.StatusForbidden, "FORBIDDEN", "无权操作")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := db.Exec(
		`UPDATE guestbook_messages SET status = 'deleted', updated_at = ? WHERE id = ? AND status != 'deleted'`,
		now, id,
	)
	if err != nil {
		writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "删除失败")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeGuestbookErr(w, http.StatusNotFound, "NOT_FOUND", "留言不存在")
		return
	}
	recordSecurityAudit(r, "guestbook.delete", "success", cu.ID, "guestbook_message", strconv.FormatInt(id, 10), "")
	writeJSON(w, map[string]any{"ok": true, "message": "已删除"})
}

func guestbookPatchStatusHandler(w http.ResponseWriter, r *http.Request, id int64) {
	cu := getCurrentUserFromRequest(r)
	if !isAdminUser(cu) {
		writeGuestbookErr(w, http.StatusForbidden, "FORBIDDEN", "无权操作")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_JSON", "请求格式不正确")
		return
	}
	status := strings.TrimSpace(body.Status)
	switch status {
	case "visible", "hidden", "deleted":
	default:
		writeGuestbookErr(w, http.StatusBadRequest, "INVALID_CONTENT", "无效的状态")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := db.Exec(
		`UPDATE guestbook_messages SET status = ?, updated_at = ? WHERE id = ?`,
		status, now, id,
	)
	if err != nil {
		writeGuestbookErr(w, http.StatusInternalServerError, "SERVER_ERROR", "更新失败")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeGuestbookErr(w, http.StatusNotFound, "NOT_FOUND", "留言不存在")
		return
	}
	recordSecurityAudit(r, "guestbook.status_change", "success", cu.ID, "guestbook_message", strconv.FormatInt(id, 10), "status="+status)
	writeJSON(w, map[string]any{"ok": true, "status": status})
}

func formatGuestbookTime(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		if t2, e2 := time.Parse("2006-01-02T15:04:05Z", iso); e2 == nil {
			t = t2
		} else {
			return iso
		}
	}
	loc := time.FixedZone("CST", 8*3600)
	t = t.In(loc)
	now := time.Now().In(loc)
	if t.Year() == now.Year() && t.YearDay() == now.YearDay() {
		return "今天 " + t.Format("15:04")
	}
	if t.Year() == now.Year() {
		return t.Format("01-02 15:04")
	}
	return t.Format("2006-01-02 15:04")
}
