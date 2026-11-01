package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func ownerVideoPublicStatus(t *testing.T, store *sql.DB, uid string) (ownerVideosSnapshot, map[string]any) {
	t.Helper()
	previousDB := db
	db = store
	defer func() { db = previousDB }()
	rr := httptest.NewRecorder()
	biliOwnerVideosHandler(AppConfig{BilibiliUID: uid})(rr, httptest.NewRequest(http.MethodGet, "/api/v1/bili/videos", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("cached GET: status=%d body=%s", rr.Code, rr.Body.String())
	}
	var snapshot ownerVideosSnapshot
	if err := json.Unmarshal(rr.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	status, ok := payload["sync"].(map[string]any)
	if !ok {
		t.Fatalf("cached GET must include sanitized sync diagnostics: %s", rr.Body.String())
	}
	for key := range status {
		if key != "state" && key != "attemptedAt" && key != "reason" && key != "upstreamCode" {
			t.Fatalf("unexpected public sync field %q", key)
		}
	}
	return snapshot, status
}

func assertOwnerVideoStatus(t *testing.T, status map[string]any, state, reason string, code *int, attempted bool) {
	t.Helper()
	if status["state"] != state || status["reason"] != reason {
		t.Fatalf("sync status=%v, want state=%s reason=%s", status, state, reason)
	}
	at, ok := status["attemptedAt"].(string)
	if !ok || (attempted && at == "") || (!attempted && at != "") {
		t.Fatalf("unexpected attempt timestamp: %v", status)
	}
	if at != "" {
		if _, err := time.Parse(time.RFC3339Nano, at); err != nil {
			t.Fatalf("invalid ISO attempt timestamp: %v", status)
		}
	}
	if code == nil {
		if _, exists := status["upstreamCode"]; exists {
			t.Fatalf("upstreamCode must be omitted without a rejection: %v", status)
		}
	} else if status["upstreamCode"] != float64(*code) {
		t.Fatalf("unexpected upstream code: %v, want %d", status, *code)
	}
}

func TestOwnerVideosSyncDiagnosticsPendingAndLegacySnapshot(t *testing.T) {
	store := openOwnerControllerTestDB(t)
	store.SetMaxOpenConns(1)
	if _, err := store.Exec(`PRAGMA query_only=ON`); err != nil {
		t.Fatal(err)
	}
	snapshot, status := ownerVideoPublicStatus(t, store, testOwnerUID)
	assertOwnerVideoStatus(t, status, "pending", "", nil, false)
	if snapshot.Ready {
		t.Fatal("diagnostics must not make a pending feed ready")
	}
	if _, err := store.Exec(`PRAGMA query_only=OFF`); err != nil {
		t.Fatal(err)
	}
	legacy := seedOwnerVideoSnapshot(t, testOwnerUID)
	if err := replaceOwnerVideos(store, legacy); err != nil {
		t.Fatal(err)
	}
	snapshot, status = ownerVideoPublicStatus(t, store, testOwnerUID)
	assertOwnerVideoStatus(t, status, "ok", "", nil, true)
	if !snapshot.Ready || status["attemptedAt"] != legacy.SyncedAt {
		t.Fatal("a pre-diagnostics successful snapshot must remain ready and report ok")
	}
}

func TestOwnerVideosSyncDiagnosticsStartFailureAndRecovery(t *testing.T) {
	store := openOwnerControllerTestDB(t)
	var startedAt any
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
		snapshot, status := ownerVideoPublicStatus(t, store, testOwnerUID)
		assertOwnerVideoStatus(t, status, "syncing", "", nil, true)
		if snapshot.Ready {
			t.Fatal("sync start must not publish a successful snapshot")
		}
		startedAt = status["attemptedAt"]
		return ownerVideoResponse(200, `{"code":-412,"message":"secret https://internal.test TOKEN /private/path"}`), nil
	})
	if err := runOwnerVideosSync(store, c, t.TempDir()); err == nil {
		t.Fatal("rejected sync must fail")
	}
	snapshot, status := ownerVideoPublicStatus(t, store, testOwnerUID)
	code := -412
	assertOwnerVideoStatus(t, status, "error", "upstream_rejected", &code, true)
	if snapshot.Ready || len(snapshot.Items) != 0 || status["attemptedAt"] != startedAt {
		t.Fatal("failed first attempt must retain pending data and its start timestamp")
	}
	c.http.Transport = ownerVideoTransport(func(*http.Request) (*http.Response, error) {
		return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil
	})
	if err := runOwnerVideosSync(store, c, t.TempDir()); err != nil {
		t.Fatal(err)
	}
	snapshot, status = ownerVideoPublicStatus(t, store, testOwnerUID)
	assertOwnerVideoStatus(t, status, "ok", "", nil, true)
	if !snapshot.Ready || len(snapshot.Items) != 0 {
		t.Fatal("successful empty feed must be ready")
	}
}

type ownerVideoFailingBody struct{ err error }

func (b ownerVideoFailingBody) Read([]byte) (int, error) { return 0, b.err }
func (b ownerVideoFailingBody) Close() error             { return nil }

func TestOwnerVideosSyncDiagnosticsSanitizedFailuresRetainSnapshot(t *testing.T) {
	for _, test := range []struct {
		name, body, reason string
		status, code       int
		transportErr       error
		bodyErr            error
	}{
		{name: "api", status: 200, body: `{"code":-352,"message":"secret https://private.test TOKEN /private/path"}`, reason: "upstream_rejected", code: -352},
		{name: "http", status: 503, body: "secret https://private.test TOKEN /private/path", reason: "upstream_rejected", code: 503},
		{name: "redirect", status: 302, reason: "upstream_rejected", code: 302},
		{name: "transport", transportErr: errors.New("secret https://private.test TOKEN /private/path"), reason: "network_error"},
		{name: "deadline", transportErr: context.DeadlineExceeded, reason: "network_error"},
		{name: "canceled", transportErr: context.Canceled, reason: "network_error"},
		{name: "body_deadline", status: 200, bodyErr: context.DeadlineExceeded, reason: "network_error"},
		{name: "body_network", status: 200, bodyErr: &net.OpError{Op: "read", Net: "tcp", Err: errors.New("secret /private/path")}, reason: "network_error"},
		{name: "truncated", status: 200, bodyErr: io.ErrUnexpectedEOF, reason: "invalid_response"},
		{name: "malformed", status: 200, body: `{"secret":"https://private.test TOKEN /private/path"`, reason: "invalid_response"},
		{name: "missing_data", status: 200, body: `{"code":0}`, reason: "invalid_response"},
		{name: "oversized", status: 200, body: strings.Repeat("x", ownerVideoMaxBody+1), reason: "invalid_response"},
		{name: "invalid_video", status: 200, body: ownerVideoPage(1, 1, map[string]any{"title": "secret"}), reason: "invalid_response"},
	} {
		t.Run(test.name, func(t *testing.T) {
			store := openOwnerControllerTestDB(t)
			before := seedOwnerVideoSnapshot(t, testOwnerUID)
			if err := replaceOwnerVideos(store, before); err != nil {
				t.Fatal(err)
			}
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				if test.transportErr != nil {
					return nil, test.transportErr
				}
				res := ownerVideoResponse(test.status, test.body)
				if test.bodyErr != nil {
					res.Body = ownerVideoFailingBody{test.bodyErr}
				}
				return res, nil
			})
			if err := runOwnerVideosSync(store, c, t.TempDir()); err == nil {
				t.Fatal("failed upstream must fail sync")
			}
			_, status := ownerVideoPublicStatus(t, store, testOwnerUID)
			var code *int
			if test.reason == "upstream_rejected" {
				code = &test.code
			}
			assertOwnerVideoStatus(t, status, "error", test.reason, code, true)
			after, err := readOwnerVideos(store, testOwnerUID)
			if err != nil || !reflect.DeepEqual(before, after) {
				t.Fatalf("failed sync changed snapshot: %+v err=%v", after, err)
			}
		})
	}
}

func TestOwnerVideosSyncDiagnosticsPersistAndIsolateOwners(t *testing.T) {
	path := filepath.Join(t.TempDir(), "owner-videos.db")
	open := func() *sql.DB {
		t.Helper()
		store, err := sql.Open("sqlite", path)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = store.Close() })
		if err := migrateOwnerVideos(store); err != nil {
			t.Fatal(err)
		}
		return store
	}
	store := open()
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
		return ownerVideoResponse(412, "private error"), nil
	})
	if err := runOwnerVideosSync(store, c, t.TempDir()); err == nil {
		t.Fatal("HTTP rejection must fail sync")
	}
	if err := store.Close(); err != nil {
		t.Fatal(err)
	}
	store = open()
	_, status := ownerVideoPublicStatus(t, store, testOwnerUID)
	code := 412
	assertOwnerVideoStatus(t, status, "error", "upstream_rejected", &code, true)
	_, other := ownerVideoPublicStatus(t, store, "42")
	assertOwnerVideoStatus(t, other, "pending", "", nil, false)
	c.cfg.BilibiliUID = "42"
	c.http.Transport = ownerVideoTransport(func(*http.Request) (*http.Response, error) {
		return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil
	})
	if err := runOwnerVideosSync(store, c, t.TempDir()); err != nil {
		t.Fatal(err)
	}
	_, other = ownerVideoPublicStatus(t, store, "42")
	assertOwnerVideoStatus(t, other, "ok", "", nil, true)
	_, retained := ownerVideoPublicStatus(t, store, testOwnerUID)
	if !reflect.DeepEqual(status, retained) {
		t.Fatalf("another owner's sync changed diagnostics: before=%v after=%v", status, retained)
	}
}

func TestOwnerVideosSyncDiagnosticsCacheFailureRetainsSnapshot(t *testing.T) {
	store := openOwnerControllerTestDB(t)
	before := seedOwnerVideoSnapshot(t, testOwnerUID)
	if err := replaceOwnerVideos(store, before); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Exec(`CREATE TRIGGER fail_owner_snapshot BEFORE UPDATE ON bili_owner_video_state
		BEGIN SELECT RAISE(ABORT, 'secret /private/path TOKEN'); END`); err != nil {
		t.Fatal(err)
	}
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
		return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil
	})
	if err := runOwnerVideosSync(store, c, t.TempDir()); err == nil {
		t.Fatal("snapshot persistence failure must fail sync")
	}
	_, status := ownerVideoPublicStatus(t, store, testOwnerUID)
	assertOwnerVideoStatus(t, status, "error", "cache_error", nil, true)
	after, err := readOwnerVideos(store, testOwnerUID)
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatalf("cache failure changed snapshot: %+v err=%v", after, err)
	}
}

func TestOwnerVideosSyncDiagnosticsStorageFailureDoesNotBlockPublication(t *testing.T) {
	for _, statement := range []string{
		`DROP TABLE bili_owner_video_attempt`,
		`CREATE TRIGGER fail_attempt_start BEFORE INSERT ON bili_owner_video_attempt
		 WHEN NEW.state = 'syncing' BEGIN SELECT RAISE(ABORT, 'secret /private/path TOKEN'); END`,
		`CREATE TRIGGER fail_attempt_end BEFORE UPDATE ON bili_owner_video_attempt
		 WHEN NEW.state = 'ok' BEGIN SELECT RAISE(ABORT, 'secret /private/path TOKEN'); END`,
	} {
		t.Run(statement, func(t *testing.T) {
			store := openOwnerControllerTestDB(t)
			if _, err := store.Exec(statement); err != nil {
				t.Fatal(err)
			}
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				return ownerVideoResponse(200, ownerVideoPage(1, 1, ownerVideoRow(1))), nil
			})
			if err := runOwnerVideosSync(store, c, t.TempDir()); err != nil {
				t.Fatalf("diagnostic write failure must not fail successful sync: %v", err)
			}
			snapshot, status := ownerVideoPublicStatus(t, store, testOwnerUID)
			if !snapshot.Ready || len(snapshot.Items) != 1 {
				t.Fatalf("diagnostic failure deleted successful feed: %+v", snapshot)
			}
			if strings.HasPrefix(statement, "DROP") {
				assertOwnerVideoStatus(t, status, "error", "cache_error", nil, false)
			}
		})
	}
}

func TestOwnerVideosSyncDiagnosticsRejectMalformedStoredValues(t *testing.T) {
	for _, mutation := range []string{
		`UPDATE bili_owner_video_attempt SET attempted_at='secret https://private.test TOKEN /private/path'`,
		`UPDATE bili_owner_video_attempt SET upstream_code='secret https://private.test TOKEN /private/path'`,
		`UPDATE bili_owner_video_attempt SET state='ok', reason='network_error'`,
		`UPDATE bili_owner_video_attempt SET reason='network_error', upstream_code=503`,
	} {
		t.Run(mutation, func(t *testing.T) {
			store := openOwnerControllerTestDB(t)
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				return ownerVideoResponse(503, "private error"), nil
			})
			if err := runOwnerVideosSync(store, c, t.TempDir()); err == nil {
				t.Fatal("HTTP rejection must fail sync")
			}
			if _, err := store.Exec(mutation); err != nil {
				t.Fatal(err)
			}
			_, status := ownerVideoPublicStatus(t, store, testOwnerUID)
			assertOwnerVideoStatus(t, status, "error", "cache_error", nil, false)
		})
	}
	store := openOwnerControllerTestDB(t)
	if err := replaceOwnerVideos(store, seedOwnerVideoSnapshot(t, testOwnerUID)); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Exec(`UPDATE bili_owner_video_state SET synced_at='not-a-timestamp'`); err != nil {
		t.Fatal(err)
	}
	_, status := ownerVideoPublicStatus(t, store, testOwnerUID)
	assertOwnerVideoStatus(t, status, "error", "cache_error", nil, false)
}

func TestOwnerVideosSyncErrorsAreTypedAndSanitized(t *testing.T) {
	for _, test := range []struct {
		name, reason string
		status, code int
		body         string
		err          error
	}{
		{name: "http", reason: "upstream_rejected", status: 412, code: 412, body: "secret https://private.test TOKEN /private/path"},
		{name: "api", reason: "upstream_rejected", status: 200, code: -412, body: `{"code":-412,"message":"secret https://private.test TOKEN /private/path"}`},
		{name: "network", reason: "network_error", err: errors.New("secret https://private.test TOKEN /private/path")},
		{name: "deadline", reason: "network_error", err: context.DeadlineExceeded},
	} {
		t.Run(test.name, func(t *testing.T) {
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				if test.err != nil {
					return nil, test.err
				}
				return ownerVideoResponse(test.status, test.body), nil
			})
			_, err := c.FetchOwnerVideos(context.Background())
			var typed *ownerVideoSyncError
			if !errors.As(err, &typed) || typed.reason != test.reason {
				t.Fatalf("expected typed %s error, got %v", test.reason, err)
			}
			if test.reason == "upstream_rejected" && (typed.code == nil || *typed.code != test.code) {
				t.Fatalf("missing numeric rejection code: %+v", typed)
			}
			if test.err != nil && !errors.Is(err, test.err) {
				t.Fatal("typed error must preserve the underlying error identity")
			}
			for _, forbidden := range []string{"secret", "https://", "TOKEN", "/private/path"} {
				if strings.Contains(err.Error(), forbidden) {
					t.Fatalf("typed error leaked %q: %v", forbidden, err)
				}
			}
		})
	}
}
