package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const testOwnerUID = "1061280173"

type ownerVideoTransport func(*http.Request) (*http.Response, error)

func (f ownerVideoTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func ownerVideoResponse(status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body))}
}

func ownerVideoRow(index int) map[string]any {
	return map[string]any{
		"bvid": fmt.Sprintf("BV%010d", index), "mid": int64(1061280173),
		"title": fmt.Sprintf("Video %d", index), "description": "Public description",
		"pic":     fmt.Sprintf("https://i0.hdslb.com/bfs/archive/%d.jpg", index),
		"created": int64(1782576250 + index), "length": "04:36", "author": "Owner",
	}
}

func ownerVideoPage(page, count int, rows ...map[string]any) string {
	if rows == nil {
		rows = []map[string]any{}
	}
	body, _ := json.Marshal(map[string]any{"code": 0, "data": map[string]any{
		"page": map[string]any{"pn": page, "ps": 30, "count": count},
		"list": map[string]any{"vlist": rows},
	}})
	return string(body)
}

func ownerVideoRows(start, count int) []map[string]any {
	rows := make([]map[string]any, count)
	for i := range rows {
		rows[i] = ownerVideoRow(start + i)
	}
	return rows
}

func ownerVideoClient(transport ownerVideoTransport) *BiliClient {
	c := NewBiliClient(AppConfig{BilibiliUID: testOwnerUID})
	c.http = &http.Client{Transport: transport}
	return c
}

func seedOwnerVideoSnapshot(t *testing.T, uid string) ownerVideosSnapshot {
	t.Helper()
	snapshot := ownerVideosSnapshot{
		Owner: biliVideoOwner{UID: uid, Name: "Cached owner", ProfileURL: "https://space.bilibili.com/" + uid + "/"},
		Ready: true, SyncedAt: "2026-01-01T00:00:00Z",
		Items: []ownerVideo{{BVID: "BV1jK7W6MEAj", Title: "Cached title", Description: "Cached description",
			Cover: "https://i0.hdslb.com/bfs/archive/old.jpg", CoverURL: "https://i0.hdslb.com/bfs/archive/old.jpg",
			PublishedAt: "2026-01-01T00:00:00Z", Duration: "04:36"}},
	}
	return snapshot
}

func TestOwnerVideosMigrationCreatesScopedTables(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	for _, table := range []string{"bili_owner_video_state", "bili_owner_videos"} {
		var count int
		if err := testDB.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("owner video migration must create %s, got %d tables", table, count)
		}
	}
}

func TestOwnerVideosStoreIsolationEmptyAndRollback(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	initial, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || initial.Ready || initial.Items == nil || len(initial.Items) != 0 || initial.SyncedAt != "" {
		t.Fatalf("first snapshot must be pending with [] items: %+v err=%v", initial, err)
	}
	first := seedOwnerVideoSnapshot(t, testOwnerUID)
	second := seedOwnerVideoSnapshot(t, "42")
	second.Items[0].Title = "Other owner"
	for _, snapshot := range []ownerVideosSnapshot{first, second} {
		if err := replaceOwnerVideos(testDB, snapshot); err != nil {
			t.Fatal(err)
		}
	}
	broken := first
	broken.Owner.Name = "Must roll back"
	broken.SyncedAt = "2026-02-01T00:00:00Z"
	broken.Items = append(append([]ownerVideo{}, first.Items...), first.Items[0])
	if err := replaceOwnerVideos(testDB, broken); err == nil {
		t.Fatal("duplicate primary keys must fail the snapshot transaction")
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || !reflect.DeepEqual(got, first) {
		t.Fatalf("failed transaction changed snapshot: %+v err=%v", got, err)
	}
	first.Items = []ownerVideo{}
	first.SyncedAt = "2026-03-01T00:00:00Z"
	if err := replaceOwnerVideos(testDB, first); err != nil {
		t.Fatal(err)
	}
	got, err = readOwnerVideos(testDB, testOwnerUID)
	if err != nil || !got.Ready || got.Items == nil || len(got.Items) != 0 || got.SyncedAt != first.SyncedAt {
		t.Fatalf("successful empty snapshot was not stored: %+v err=%v", got, err)
	}
	other, err := readOwnerVideos(testDB, "42")
	if err != nil || !reflect.DeepEqual(other, second) {
		t.Fatalf("replacing one owner changed another: %+v err=%v", other, err)
	}
}

func TestOwnerVideosHandlerOnlyReadsConfiguredCache(t *testing.T) {
	withOwnerControllerTestDB(t, func() {
		db.SetMaxOpenConns(1)
		previousTransport := http.DefaultTransport
		http.DefaultTransport = ownerVideoTransport(func(*http.Request) (*http.Response, error) {
			t.Error("cache GET must not contact upstream")
			return nil, fmt.Errorf("unexpected upstream request")
		})
		t.Cleanup(func() { http.DefaultTransport = previousTransport })
		if _, err := db.Exec(`PRAGMA query_only=ON`); err != nil {
			t.Fatal(err)
		}
		handler := biliOwnerVideosHandler(AppConfig{BilibiliUID: testOwnerUID})
		for _, test := range []struct {
			method, target string
			status         int
		}{
			{http.MethodGet, "/api/v1/bili/videos", http.StatusOK},
			{http.MethodGet, "/api/v1/bili/videos?uid=42", http.StatusBadRequest},
			{http.MethodGet, "/api/v1/bili/videos?refresh=1", http.StatusBadRequest},
			{http.MethodPost, "/api/v1/bili/videos", http.StatusMethodNotAllowed},
		} {
			rr := httptest.NewRecorder()
			handler(rr, httptest.NewRequest(test.method, test.target, nil))
			if rr.Code != test.status {
				t.Fatalf("%s %s: status=%d body=%s", test.method, test.target, rr.Code, rr.Body.String())
			}
			if test.status == http.StatusOK {
				var payload map[string]any
				if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}
				owner := payload["owner"].(map[string]any)
				items, ok := payload["items"].([]any)
				if owner["uid"] != testOwnerUID || owner["profileUrl"] != "https://space.bilibili.com/"+testOwnerUID+"/" || !ok || len(items) != 0 || payload["ready"] != false || payload["syncedAt"] != "" {
					t.Fatalf("unexpected pending contract: %s", rr.Body.String())
				}
			}
		}
	})
}

func TestOwnerVideosFetchesCompletePaginationWithoutCookies(t *testing.T) {
	var pages []int
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		q := r.URL.Query()
		page, _ := strconv.Atoi(q.Get("pn"))
		pages = append(pages, page)
		if r.Method != http.MethodGet || r.URL.Scheme != "https" || r.URL.Host != "api.bilibili.com" || r.URL.Path != "/x/space/arc/search" || q.Get("mid") != testOwnerUID || q.Get("ps") != "30" || q.Get("order") != "pubdate" {
			t.Errorf("unexpected public API request: %s", r.URL)
		}
		if r.Header.Get("Cookie") != "" || q.Get("w_rid") != "" {
			t.Error("owner feed must not use cookies or WBI")
		}
		deadline, ok := r.Context().Deadline()
		if !ok || time.Until(deadline) > 10*time.Second {
			t.Error("request must have a bounded timeout")
		}
		if page == 1 {
			return ownerVideoResponse(200, ownerVideoPage(1, 32, ownerVideoRows(1, 30)...)), nil
		}
		return ownerVideoResponse(200, ownerVideoPage(2, 32, ownerVideoRows(31, 2)...)), nil
	})
	snapshot, err := c.FetchOwnerVideos(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(pages, []int{1, 2}) || len(snapshot.Items) != 32 || snapshot.Owner.UID != testOwnerUID || snapshot.Owner.Name != "Owner" {
		t.Fatalf("incomplete pagination: pages=%v snapshot=%+v", pages, snapshot)
	}
	if snapshot.Items[0].PublishedAt != time.Unix(1782576251, 0).UTC().Format(time.RFC3339) || snapshot.Items[0].Duration != "04:36" || snapshot.Items[0].Description != "Public description" {
		t.Fatalf("metadata mapping failed: %+v", snapshot.Items[0])
	}
}

func TestOwnerVideosNormalizesLegacyCDNCoversToHTTPS(t *testing.T) {
	for _, cover := range []string{"http://i0.hdslb.com/bfs/archive/a.jpg", "//i0.hdslb.com/bfs/archive/a.jpg"} {
		t.Run(cover, func(t *testing.T) {
			row := ownerVideoRow(1)
			row["pic"] = cover
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				return ownerVideoResponse(200, ownerVideoPage(1, 1, row)), nil
			})
			snapshot, err := c.FetchOwnerVideos(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			if snapshot.Items[0].Cover != "https://i0.hdslb.com/bfs/archive/a.jpg" || snapshot.Items[0].CoverURL != snapshot.Items[0].Cover {
				t.Fatalf("unsafe legacy cover not upgraded: %+v", snapshot.Items[0])
			}
		})
	}
}

func TestOwnerVideosAPIErrorReportsActualCode(t *testing.T) {
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) { return ownerVideoResponse(200, `{"code":-412}`), nil })
	_, err := c.FetchOwnerVideos(context.Background())
	if err == nil || !strings.Contains(err.Error(), "code=-412") {
		t.Fatalf("expected actual upstream code in error, got %v", err)
	}
}

func TestOwnerVideosFirstFailureDoesNotBecomeReady(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) { return nil, io.ErrUnexpectedEOF })
	if err := runOwnerVideosSync(testDB, c, t.TempDir()); err == nil {
		t.Fatal("transport failure must fail sync")
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || got.Ready || got.Items == nil || len(got.Items) != 0 || got.SyncedAt != "" {
		t.Fatalf("first failure changed pending state: %+v err=%v", got, err)
	}
	c.http.Transport = ownerVideoTransport(func(*http.Request) (*http.Response, error) { return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil })
	if err := runOwnerVideosSync(testDB, c, t.TempDir()); err != nil {
		t.Fatal(err)
	}
	got, err = readOwnerVideos(testDB, testOwnerUID)
	if err != nil || !got.Ready || got.Items == nil || len(got.Items) != 0 {
		t.Fatalf("first empty success must become ready: %+v err=%v", got, err)
	}
}

func TestOwnerVideosHandlerReturnsCachedItemsWithoutFilesystemOrNetwork(t *testing.T) {
	withOwnerControllerTestDB(t, func() {
		db.SetMaxOpenConns(1)
		cached := seedOwnerVideoSnapshot(t, testOwnerUID)
		cached.Items[0].CoverPath = "owner_cached_cover.img"
		if err := replaceOwnerVideos(db, cached); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`PRAGMA query_only=ON`); err != nil {
			t.Fatal(err)
		}
		prevCache := cacheDir
		cacheDir = filepath.Join(t.TempDir(), "not-created")
		t.Cleanup(func() { cacheDir = prevCache })
		rr := httptest.NewRecorder()
		biliOwnerVideosHandler(AppConfig{BilibiliUID: testOwnerUID})(rr, httptest.NewRequest(http.MethodGet, "/api/v1/bili/videos", nil))
		if rr.Code != 200 {
			t.Fatalf("read cached response: status=%d body=%s", rr.Code, rr.Body.String())
		}
		var got ownerVideosSnapshot
		if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if !got.Ready || got.SyncedAt != cached.SyncedAt || got.Owner.Name != cached.Owner.Name || len(got.Items) != 1 || got.Items[0].Cover != "/api/v1/acg/image/owner_cached_cover.img" || got.Items[0].BVID != cached.Items[0].BVID {
			t.Fatalf("cached contract: %s", rr.Body.String())
		}
		if strings.Contains(rr.Body.String(), "CoverPath") || strings.Contains(rr.Body.String(), "cover_url") || strings.Contains(rr.Body.String(), "CoverURL") {
			t.Fatal("internal cover fields leaked")
		}
	})
}

func TestOwnerVideosAuthorizedManualSyncIncludesOwner(t *testing.T) {
	withOwnerControllerTestDB(t, func() {
		db.SetMaxOpenConns(1)
		syncRunning.Store(false)
		t.Cleanup(func() { syncRunning.Store(false) })
		var calls atomic.Int64
		prevTransport := http.DefaultTransport
		http.DefaultTransport = ownerVideoTransport(func(r *http.Request) (*http.Response, error) {
			if r.URL.Path == "/x/space/arc/search" {
				calls.Add(1)
				return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil
			}
			if r.URL.Path != "/x/space/bangumi/follow/list" {
				t.Errorf("unexpected manual sync request: %s", r.URL)
			}
			return ownerVideoResponse(200, `{"code":-1}`), nil
		})
		t.Cleanup(func() { http.DefaultTransport = prevTransport })
		t.Setenv("SYNC_TRIGGER_TOKEN", "owner-videos-test-token")
		req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/trigger", nil)
		req.Header.Set("X-Sync-Trigger-Token", "owner-videos-test-token")
		rr := httptest.NewRecorder()
		syncTriggerHandler(AppConfig{BilibiliUID: testOwnerUID})(rr, req)
		if rr.Code != 200 {
			t.Fatalf("authorized sync: status=%d body=%s", rr.Code, rr.Body.String())
		}
		deadline := time.Now().Add(3 * time.Second)
		for syncRunning.Load() && time.Now().Before(deadline) {
			time.Sleep(time.Millisecond)
		}
		if syncRunning.Load() {
			t.Fatal("manual sync did not finish")
		}
		got, err := readOwnerVideos(db, testOwnerUID)
		if err != nil || !got.Ready || calls.Load() != 1 {
			t.Fatalf("manual sync did not include owner feed: %+v err=%v calls=%d", got, err, calls.Load())
		}
	})
}

func TestOwnerVideosInvalidUpstreamPreservesEntireSnapshot(t *testing.T) {
	badRow := func(key string, value any) string {
		row := ownerVideoRow(1)
		row[key] = value
		return ownerVideoPage(1, 1, row)
	}
	for _, test := range []struct {
		name, first, second string
		status              int
	}{
		{"code", `{"code":-412}`, "", 200},
		{"http", ownerVideoPage(1, 0), "", 503},
		{"malformed", `{`, "", 200},
		{"missing_data", `{"code":0}`, "", 200},
		{"missing_code", `{"data":{"page":{"pn":1,"ps":30,"count":0},"list":{"vlist":[]}}}`, "", 200},
		{"missing_count", `{"code":0,"data":{"page":{"pn":1,"ps":30},"list":{"vlist":[]}}}`, "", 200},
		{"null_list", `{"code":0,"data":{"page":{"pn":1,"ps":30,"count":0},"list":{"vlist":null}}}`, "", 200},
		{"false_empty", ownerVideoPage(1, 0, ownerVideoRow(1)), "", 200},
		{"uid", badRow("mid", 42), "", 200},
		{"null_uid", badRow("mid", nil), "", 200},
		{"bvid", badRow("bvid", "../../escape"), "", 200},
		{"title", badRow("title", " "), "", 200},
		{"created", badRow("created", 0), "", 200},
		{"duration", badRow("length", "4:99"), "", 200},
		{"author", badRow("author", ""), "", 200},
		{"unsafe_cover", badRow("pic", "https://i0.hdslb.com.evil.test/cover.jpg"), "", 200},
		{"partial_validity", ownerVideoPage(1, 2, ownerVideoRow(1), map[string]any{"bvid": "invalid"}), "", 200},
		{"short_page", ownerVideoPage(1, 31, ownerVideoRow(1)), "", 200},
		{"partial_http", ownerVideoPage(1, 31, ownerVideoRows(1, 30)...), "HTTP_ERROR", 200},
		{"count_changed", ownerVideoPage(1, 31, ownerVideoRows(1, 30)...), ownerVideoPage(2, 30), 200},
		{"duplicate", ownerVideoPage(1, 31, ownerVideoRows(1, 30)...), ownerVideoPage(2, 31, ownerVideoRow(1)), 200},
		{"wrong_page", ownerVideoPage(2, 1, ownerVideoRow(1)), "", 200},
		{"too_many_pages", ownerVideoPage(1, 3001, ownerVideoRows(1, 30)...), "", 200},
		{"oversized", strings.Repeat(" ", 2*1024*1024+1), "", 200},
		{"trailing_json", ownerVideoPage(1, 0) + `{}`, "", 200},
	} {
		t.Run(test.name, func(t *testing.T) {
			testDB := openOwnerControllerTestDB(t)
			before := seedOwnerVideoSnapshot(t, testOwnerUID)
			if err := replaceOwnerVideos(testDB, before); err != nil {
				t.Fatal(err)
			}
			requests := 0
			c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
				requests++
				if r.URL.Host != "api.bilibili.com" {
					t.Error("must validate all pages before cover downloads")
				}
				if requests == 1 {
					return ownerVideoResponse(test.status, test.first), nil
				}
				if test.second == "HTTP_ERROR" {
					return ownerVideoResponse(502, "upstream failed"), nil
				}
				return ownerVideoResponse(200, test.second), nil
			})
			if err := runOwnerVideosSync(testDB, c, t.TempDir()); err == nil {
				t.Fatal("invalid upstream must fail sync")
			}
			after, err := readOwnerVideos(testDB, testOwnerUID)
			if err != nil || !reflect.DeepEqual(before, after) {
				t.Fatalf("failed sync replaced cached snapshot: %+v err=%v", after, err)
			}
			if requests > 2 {
				t.Fatalf("unbounded pagination: %d requests", requests)
			}
		})
	}
}

func TestOwnerVideosSuccessfulEmptyClearsOnlyConfiguredOwner(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	for _, uid := range []string{testOwnerUID, "42"} {
		if err := replaceOwnerVideos(testDB, seedOwnerVideoSnapshot(t, uid)); err != nil {
			t.Fatal(err)
		}
	}
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) { return ownerVideoResponse(200, ownerVideoPage(1, 0)), nil })
	if err := runOwnerVideosSync(testDB, c, t.TempDir()); err != nil {
		t.Fatal(err)
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || !got.Ready || got.Items == nil || len(got.Items) != 0 || got.Owner.Name != "Cached owner" || got.SyncedAt == "2026-01-01T00:00:00Z" {
		t.Fatalf("empty success: %+v err=%v", got, err)
	}
	if _, err := time.Parse(time.RFC3339, got.SyncedAt); err != nil {
		t.Fatal(err)
	}
	other, err := readOwnerVideos(testDB, "42")
	if err != nil || len(other.Items) != 1 {
		t.Fatalf("empty sync removed other owner: %+v err=%v", other, err)
	}
}

func TestOwnerVideosCover404AndPreservesGoodImage(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	dir := t.TempDir()
	row := ownerVideoRow(1)
	status := http.StatusNotFound
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.bilibili.com" {
			return ownerVideoResponse(200, ownerVideoPage(1, 1, row)), nil
		}
		return ownerVideoResponse(status, string(ownerCoverPNG(t, 1, 1))), nil
	})
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	got, _ := readOwnerVideos(testDB, testOwnerUID)
	if got.Items[0].Cover != row["pic"] || got.Items[0].CoverPath != "" {
		t.Fatalf("404 must retain safe remote cover: %+v", got.Items[0])
	}
	status = http.StatusOK
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	got, _ = readOwnerVideos(testDB, testOwnerUID)
	oldPath := got.Items[0].CoverPath
	if !strings.Contains(oldPath, row["bvid"].(string)) || got.Items[0].Cover != "/api/v1/acg/image/"+oldPath {
		t.Fatalf("missing immutable local cover: %+v", got.Items[0])
	}
	before, err := os.ReadFile(filepath.Join(dir, oldPath))
	if err != nil {
		t.Fatal(err)
	}
	row["pic"] = "https://i1.hdslb.com/bfs/archive/changed.png"
	status = http.StatusNotFound
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	got, _ = readOwnerVideos(testDB, testOwnerUID)
	if got.Items[0].CoverPath != oldPath {
		t.Fatalf("failed replacement erased good image: %+v", got.Items[0])
	}
	after, err := os.ReadFile(filepath.Join(dir, oldPath))
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatal("failed download modified cached file")
	}
	status = http.StatusOK
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	got, _ = readOwnerVideos(testDB, testOwnerUID)
	if got.Items[0].CoverPath == oldPath {
		t.Fatal("changed cover URL must produce a different hashed filename")
	}
	previousCache := cacheDir
	cacheDir = dir
	t.Cleanup(func() { cacheDir = previousCache })
	rr := httptest.NewRecorder()
	imageHandler(rr, httptest.NewRequest(http.MethodGet, got.Items[0].Cover, nil))
	if rr.Code != 200 || !reflect.DeepEqual(rr.Body.Bytes(), ownerCoverPNG(t, 1, 1)) {
		t.Fatalf("image route: %d", rr.Code)
	}
}

func TestOwnerVideosCoverRejectsUnsafeURLsRedirectsAndOversizedBodies(t *testing.T) {
	for _, rawURL := range []string{
		"http://i0.hdslb.com/a.jpg", "https://i0.hdslb.com.evil.test/a.jpg", "https://evilhdslb.com/a.jpg",
		"https://user@i0.hdslb.com/a.jpg", "https://i0.hdslb.com:444/a.jpg", "https://127.0.0.1/a.jpg",
		"//i0.hdslb.com/a.jpg", "https://hdslb.com/a.jpg", "https://i0.hdslb.com/a.jpg#fragment",
	} {
		t.Run(rawURL, func(t *testing.T) {
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				t.Error("unsafe cover requested")
				return nil, fmt.Errorf("unexpected")
			})
			if _, err := cacheOwnerVideoCover(context.Background(), c.http, t.TempDir(), testOwnerUID, "BV1jK7W6MEAj", rawURL); err == nil {
				t.Fatal("unsafe URL accepted")
			}
		})
	}
	for _, test := range []struct {
		name   string
		status int
		body   string
	}{
		{"redirect", 302, ""}, {"oversized", 200, strings.Repeat("a", 8*1024*1024+1)}, {"html", 200, "<html>not an image</html>"},
	} {
		t.Run(test.name, func(t *testing.T) {
			requests := 0
			c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
				requests++
				response := ownerVideoResponse(test.status, test.body)
				response.Header.Set("Location", "http://127.0.0.1/private")
				return response, nil
			})
			dir := t.TempDir()
			if _, err := cacheOwnerVideoCover(context.Background(), c.http, dir, testOwnerUID, "BV1jK7W6MEAj", "https://i0.hdslb.com/a.jpg"); err == nil {
				t.Fatal("invalid cover accepted")
			}
			files, _ := os.ReadDir(dir)
			if requests != 1 || len(files) != 0 {
				t.Fatalf("redirect followed or partial file leaked: requests=%d files=%v", requests, files)
			}
		})
	}
}

func TestOwnerVideosCacheCleanupPreservesReferencedOldCovers(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	dir := t.TempDir()
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.bilibili.com" {
			return ownerVideoResponse(200, ownerVideoPage(1, 1, ownerVideoRow(1))), nil
		}
		return ownerVideoResponse(200, string(ownerCoverPNG(t, 1, 1))), nil
	})
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	before, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil {
		t.Fatal(err)
	}
	old := time.Now().Add(-8 * 24 * time.Hour)
	for _, item := range before.Items {
		if err := os.Chtimes(filepath.Join(dir, item.CoverPath), old, old); err != nil {
			t.Fatal(err)
		}
	}
	orphan, err := cacheOwnerVideoCover(context.Background(), c.http, dir, testOwnerUID, "BV0000000002", "https://i0.hdslb.com/orphan.png")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(filepath.Join(dir, orphan), old, old); err != nil {
		t.Fatal(err)
	}
	c.http.Transport = ownerVideoTransport(func(*http.Request) (*http.Response, error) { return ownerVideoResponse(412, "blocked"), nil })
	if err := runOwnerVideosSync(testDB, c, dir); err == nil {
		t.Fatal("blocked upstream must fail")
	}
	cleanupACGCache(testDB, dir, 7*24*time.Hour)
	if !ownerVideoCachedCover(dir, before.Items[0].CoverPath) {
		t.Fatal("cleanup erased a good cover still referenced by the retained snapshot")
	}
	if _, err := os.Stat(filepath.Join(dir, orphan)); !os.IsNotExist(err) {
		t.Fatal("cleanup must still remove old unreferenced files")
	}
	after, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatalf("cleanup must not modify the SQLite snapshot: %+v err=%v", after, err)
	}
}

func TestOwnerVideosScheduledJobWaitsForBusyStartupLock(t *testing.T) {
	syncRunning.Store(true)
	done := make(chan struct{})
	ran := make(chan struct{}, 1)
	go func() {
		runSyncJob("owner-videos", func() {
			if !syncRunning.Load() {
				t.Error("scheduled job must hold shared lock")
			}
			ran <- struct{}{}
		})
		close(done)
	}()
	select {
	case <-done:
		syncRunning.Store(false)
		t.Fatal("scheduled startup work must wait, not skip while another sync is active")
	case <-time.After(30 * time.Millisecond):
	}
	syncRunning.Store(false)
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("queued startup sync never ran")
	}
	if len(ran) != 1 || syncRunning.Load() {
		t.Fatal("queued sync must run exactly once and release the lock")
	}
}
