package main

import (
	"database/sql"
	"net/url"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

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

func TestLoliconWallpaperEndpointRequestsLandscapeSFWImages(t *testing.T) {
	endpoint, err := url.Parse(buildLoliconWallpaperEndpoint(4))
	if err != nil {
		t.Fatal(err)
	}
	if got := endpoint.Host; got != "api.lolicon.app" {
		t.Fatalf("expected lolicon api host, got %q", got)
	}
	query := endpoint.Query()
	if got := query.Get("num"); got != "4" {
		t.Fatalf("expected num=4, got %q", got)
	}
	if got := query.Get("r18"); got != "0" {
		t.Fatalf("expected r18=0, got %q", got)
	}
	if got := query.Get("aspect_ratio"); got != "horizontal" {
		t.Fatalf("expected aspect_ratio=horizontal, got %q", got)
	}
	if got := query.Get("size"); got != "regular" {
		t.Fatalf("expected size=regular, got %q", got)
	}
	if got := query.Get("proxy"); got != wallpaperUpstreamImageProxy {
		t.Fatalf("expected proxy=%s, got %q", wallpaperUpstreamImageProxy, got)
	}
}

func TestLoliconItemMapsLandscapeImage(t *testing.T) {
	now := time.Date(2026, 10, 26, 8, 0, 0, 0, time.UTC)
	item, ok := loliconItemToWallpaperItem(loliconItem{
		PID:    86081607,
		P:      0,
		Author: "FALL",
		Width:  1926,
		Height: 1233,
		URLs: loliconImageURLs{
			Regular: "https://i.pixiv.re/img-master/img/regular.jpg",
			Small:   "https://i.pixiv.re/c/540x540_70/img-master/img/small.jpg",
		},
	}, now)
	if !ok {
		t.Fatal("expected landscape image to map into wallpaper item")
	}
	if item.Source != wallpaperUpstreamSource {
		t.Fatalf("expected %s source, got %q", wallpaperUpstreamSource, item.Source)
	}
	if item.Author != "FALL" {
		t.Fatalf("expected upstream author, got %q", item.Author)
	}
	if item.URL != "https://i.pixiv.re/img-master/img/regular.jpg" {
		t.Fatalf("unexpected image url: %s", item.URL)
	}
	if item.PreviewURL != "https://i.pixiv.re/c/540x540_70/img-master/img/small.jpg" {
		t.Fatalf("expected lightweight preview url, got %s", item.PreviewURL)
	}
	if item.SourceURL != "https://www.pixiv.net/artworks/86081607" {
		t.Fatalf("unexpected source url: %s", item.SourceURL)
	}
	if item.Kind != "api" {
		t.Fatalf("expected api kind, got %q", item.Kind)
	}
	if strings.Contains(item.URL, "waifu.im") {
		t.Fatalf("wallpaper must not point at the retired waifu.im CDN: %s", item.URL)
	}
}

func TestLoliconItemRejectsPortraitAndR18(t *testing.T) {
	now := time.Now().UTC()
	portrait := loliconItem{
		PID:    9001,
		Width:  1200,
		Height: 2000,
		URLs:   loliconImageURLs{Regular: "https://i.pixiv.re/portrait.jpg"},
	}
	if _, ok := loliconItemToWallpaperItem(portrait, now); ok {
		t.Fatal("expected portrait image to be rejected for wallpaper usage")
	}
	nsfw := portrait
	nsfw.Width, nsfw.Height, nsfw.R18 = 2000, 1200, true
	if _, ok := loliconItemToWallpaperItem(nsfw, now); ok {
		t.Fatal("expected r18 image to be rejected")
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
