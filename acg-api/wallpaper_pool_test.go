package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func TestWarmWallpaperPreviewsFetchesPreviewImageFirst(t *testing.T) {
	var paths []string
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.URL.Path)
		if r.Header.Get("Referer") == "" {
			t.Errorf("expected a Referer header while warming, got none")
		}
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("fake-image"))
	}))
	defer server.Close()

	warmWallpaperPreviewsWith(server.Client(), []wallpaperItem{
		{ID: "with-preview", URL: server.URL + "/full.jpg", PreviewURL: server.URL + "/small.jpg"},
		{ID: "without-preview", URL: server.URL + "/fallback.jpg"},
		{ID: "no-links"},
	})

	if len(paths) != 2 {
		t.Fatalf("expected 2 warmed images, got %d (%v)", len(paths), paths)
	}
	if paths[0] != "/small.jpg" {
		t.Fatalf("expected the preview image to be warmed, got %q", paths[0])
	}
	if paths[1] != "/fallback.jpg" {
		t.Fatalf("expected url fallback when no preview exists, got %q", paths[1])
	}
}

func TestWarmWallpaperPreviewsToleratesFailures(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	warmWallpaperPreviewsWith(server.Client(), []wallpaperItem{
		{ID: "blocked", URL: server.URL + "/blocked.jpg"},
		{ID: "skips-insecure", URL: "http://example.test/insecure.jpg"},
	})
}

func openWallpaperTestDB(t *testing.T) *sql.DB {
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

func TestInsertAPIWallpapersPrunesOldestRows(t *testing.T) {
	testDB := openWallpaperTestDB(t)
	oldNow := time.Date(2026, 6, 5, 8, 0, 0, 0, time.UTC)
	for i := 0; i < wallpaperAPIMaxItems; i++ {
		item := wallpaperItem{
			ID:          "old-" + time.Duration(i).String(),
			URL:         "https://example.com/old-" + time.Duration(i).String() + ".jpg",
			PreviewURL:  "https://example.com/old-" + time.Duration(i).String() + "-preview.jpg",
			Source:      "test",
			Author:      "tester",
			SourceURL:   "https://example.com",
			LicenseNote: "test license",
			Kind:        "api",
			Status:      "active",
			AddedAt:     oldNow.Add(time.Duration(i) * time.Minute),
		}
		if err := insertWallpaperItems(testDB, []wallpaperItem{item}, oldNow); err != nil {
			t.Fatal(err)
		}
	}

	newNow := oldNow.Add(2 * time.Hour)
	newItems := make([]wallpaperItem, 10)
	for i := range newItems {
		newItems[i] = wallpaperItem{
			ID:          "new-" + time.Duration(i).String(),
			URL:         "https://example.com/new-" + time.Duration(i).String() + ".jpg",
			PreviewURL:  "https://example.com/new-" + time.Duration(i).String() + "-preview.jpg",
			Source:      "test",
			Author:      "tester",
			SourceURL:   "https://example.com",
			LicenseNote: "test license",
			Kind:        "api",
			Status:      "active",
			AddedAt:     newNow.Add(time.Duration(i) * time.Minute),
		}
	}
	if err := insertWallpaperItems(testDB, newItems, newNow); err != nil {
		t.Fatal(err)
	}

	var count int
	if err := testDB.QueryRow(`SELECT COUNT(*) FROM wallpaper_pool WHERE kind='api'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != wallpaperAPIMaxItems {
		t.Fatalf("expected %d api wallpapers, got %d", wallpaperAPIMaxItems, count)
	}

	var oldCount int
	if err := testDB.QueryRow(`SELECT COUNT(*) FROM wallpaper_pool WHERE id LIKE 'old-%'`).Scan(&oldCount); err != nil {
		t.Fatal(err)
	}
	if oldCount != wallpaperAPIMaxItems-10 {
		t.Fatalf("expected oldest 10 rows pruned, old row count = %d", oldCount)
	}
}

func TestDrawWallpaperReturnsActiveItem(t *testing.T) {
	testDB := openWallpaperTestDB(t)
	now := time.Date(2026, 6, 5, 8, 0, 0, 0, time.UTC)
	if err := insertWallpaperItems(testDB, []wallpaperItem{
		{
			ID:          "active-one",
			URL:         "https://example.com/active.jpg",
			PreviewURL:  "https://example.com/active-preview.jpg",
			Source:      wallpaperUpstreamSource,
			Author:      "tester",
			SourceURL:   "https://example.com/source",
			LicenseNote: "Pixiv artwork served through the Lolicon API",
			Kind:        "api",
			Status:      "active",
			AddedAt:     now,
		},
	}, now); err != nil {
		t.Fatal(err)
	}

	item, err := drawWallpaperItem(testDB)
	if err != nil {
		t.Fatal(err)
	}
	if item.URL != "https://example.com/active.jpg" {
		t.Fatalf("unexpected drawn wallpaper url: %s", item.URL)
	}
	if item.Source != wallpaperUpstreamSource {
		t.Fatalf("unexpected source: %s", item.Source)
	}
}

func TestDrawAPIWallpaperIgnoresLocalFallbackRows(t *testing.T) {
	testDB := openWallpaperTestDB(t)
	now := time.Date(2026, 6, 5, 8, 0, 0, 0, time.UTC)
	if err := insertWallpaperItems(testDB, []wallpaperItem{
		{
			ID:          "local-fallback",
			URL:         "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/local.jpg",
			PreviewURL:  "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/local-preview.jpg",
			Source:      "local-gallery",
			Author:      "tester",
			SourceURL:   "https://taozhiyy.top/gallery",
			LicenseNote: "local fallback",
			Kind:        "fallback",
			Status:      "active",
			AddedAt:     now,
		},
		{
			ID:          "api-one",
			URL:         "https://i.pixiv.re/img-master/img/2020/12/04/11/42/53/86081607_p0_master1200.jpg",
			PreviewURL:  "https://i.pixiv.re/c/540x540_70/img-master/img/2020/12/04/11/42/53/86081607_p0_master1200.jpg",
			Source:      wallpaperUpstreamSource,
			Author:      "tester",
			SourceURL:   "https://www.pixiv.net/artworks/86081607",
			LicenseNote: "Pixiv artwork served through the Lolicon API",
			Kind:        "api",
			Status:      "active",
			AddedAt:     now,
		},
	}, now); err != nil {
		t.Fatal(err)
	}

	item, err := drawAPIWallpaperItem(testDB)
	if err != nil {
		t.Fatal(err)
	}
	if item.Kind != "api" {
		t.Fatalf("expected api item, got kind %q", item.Kind)
	}
	if item.Source != wallpaperUpstreamSource {
		t.Fatalf("expected %s source, got %q", wallpaperUpstreamSource, item.Source)
	}
	if strings.Contains(item.URL, "myqcloud.com") {
		t.Fatalf("expected non-COS api wallpaper, got %s", item.URL)
	}
}

func TestAPIFallbackWallpaperIsNotCOS(t *testing.T) {
	item := apiFallbackWallpaperItem()
	if item.Kind != "api" {
		t.Fatalf("expected api kind, got %q", item.Kind)
	}
	if item.Source == "local-gallery" {
		t.Fatalf("expected external api source, got %q", item.Source)
	}
	if strings.Contains(item.URL, "myqcloud.com") {
		t.Fatalf("expected non-COS fallback, got %s", item.URL)
	}
}

func TestFetchAlcyWallpapersCollectsUniqueStaticWebp(t *testing.T) {
	var hits int
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		w.Header().Set("Location", fmt.Sprintf("/pic/pc/wall-%d.webp", hits))
		w.WriteHeader(http.StatusFound)
	}))
	defer server.Close()

	// The production client stops at the redirect; the test client must behave
	// the same way, otherwise it follows the Location and sees a 404 body.
	client := &http.Client{
		Transport: server.Client().Transport,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	items, err := fetchAlcyWallpapersWith(client, server.URL+"/pc", 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 wallpapers, got %d", len(items))
	}
	for _, item := range items {
		if item.Source != wallpaperUpstreamSource {
			t.Fatalf("expected %s source, got %q", wallpaperUpstreamSource, item.Source)
		}
		if !strings.HasPrefix(item.URL, server.URL+"/pic/pc/") || !strings.HasSuffix(item.URL, ".webp") {
			t.Fatalf("expected an absolute static webp url, got %q", item.URL)
		}
		if item.PreviewURL != item.URL {
			t.Fatalf("expected preview to reuse the static file, got %q", item.PreviewURL)
		}
		if item.Kind != "api" {
			t.Fatalf("expected api kind, got %q", item.Kind)
		}
	}
	if items[0].ID == items[1].ID {
		t.Fatal("expected distinct ids for distinct wallpapers")
	}
}

func TestResolveAlcyWallpaperRejectsUnusableResponses(t *testing.T) {
	withRedirectsDisabled := func(server *httptest.Server) *http.Client {
		return &http.Client{
			Transport: server.Client().Transport,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
	}

	noRedirect := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer noRedirect.Close()
	if _, err := resolveAlcyWallpaper(withRedirectsDisabled(noRedirect), noRedirect.URL+"/pc"); err == nil {
		t.Fatal("expected a non-redirect response to be rejected")
	}

	jpegRedirect := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "/pic/pc/wall.jpg")
		w.WriteHeader(http.StatusFound)
	}))
	defer jpegRedirect.Close()
	if _, err := resolveAlcyWallpaper(withRedirectsDisabled(jpegRedirect), jpegRedirect.URL+"/pc"); err == nil {
		t.Fatal("expected a non-webp redirect target to be rejected")
	}
}

func TestDeactivateWallpaperSourcesOutsideRetiresDeadSources(t *testing.T) {
	testDB := openWallpaperTestDB(t)
	now := time.Date(2026, 6, 5, 8, 0, 0, 0, time.UTC)
	if err := insertWallpaperItems(testDB, []wallpaperItem{
		{
			ID:      "dead-one",
			URL:     "https://cdn.waifu.im/6321.png",
			Source:  "waifu.im",
			Kind:    "api",
			Status:  "active",
			AddedAt: now,
		},
		{
			ID:      "alive-one",
			URL:     "https://i.pixiv.re/alive.jpg",
			Source:  wallpaperUpstreamSource,
			Kind:    "api",
			Status:  "active",
			AddedAt: now,
		},
	}, now); err != nil {
		t.Fatal(err)
	}

	if err := deactivateWallpaperSourcesOutside(testDB, enabledWallpaperSources); err != nil {
		t.Fatal(err)
	}

	var deadStatus, aliveStatus string
	if err := testDB.QueryRow(`SELECT status FROM wallpaper_pool WHERE id='dead-one'`).Scan(&deadStatus); err != nil {
		t.Fatal(err)
	}
	if err := testDB.QueryRow(`SELECT status FROM wallpaper_pool WHERE id='alive-one'`).Scan(&aliveStatus); err != nil {
		t.Fatal(err)
	}
	if deadStatus != "inactive" {
		t.Fatalf("expected retired source to be deactivated, got %q", deadStatus)
	}
	if aliveStatus != "active" {
		t.Fatalf("expected enabled source to stay active, got %q", aliveStatus)
	}

	item, err := drawAPIWallpaperItem(testDB)
	if err != nil {
		t.Fatal(err)
	}
	if item.ID != "alive-one" {
		t.Fatalf("expected only the live source to be drawable, got %q", item.ID)
	}
}
