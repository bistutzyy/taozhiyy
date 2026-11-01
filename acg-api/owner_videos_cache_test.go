package main

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func ownerCoverPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	var body bytes.Buffer
	if err := png.Encode(&body, image.NewGray(image.Rect(0, 0, width, height))); err != nil {
		t.Fatal(err)
	}
	return body.Bytes()
}

func TestOwnerVideosTruncatedCoverPreservesGoodImageAndRetries(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	dir := t.TempDir()
	row := ownerVideoRow(1)
	good := ownerCoverPNG(t, 2, 2)
	body := good
	imageCalls := 0
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.bilibili.com" {
			return ownerVideoResponse(200, ownerVideoPage(1, 1, row)), nil
		}
		imageCalls++
		return ownerVideoResponse(200, string(body)), nil
	})
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	before, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || len(before.Items) != 1 || before.Items[0].CoverPath == "" {
		t.Fatalf("initial good cover not cached: %+v err=%v", before, err)
	}
	oldPath := before.Items[0].CoverPath
	row["pic"] = "https://i0.hdslb.com/new-truncated.png"
	body = good[:33]
	for attempt := 0; attempt < 2; attempt++ {
		if err := runOwnerVideosSync(testDB, c, dir); err != nil {
			t.Fatal(err)
		}
		got, err := readOwnerVideos(testDB, testOwnerUID)
		if err != nil || got.Items[0].CoverPath != oldPath {
			t.Fatalf("truncated image replaced good cached cover: %+v err=%v", got, err)
		}
		if imageCalls != attempt+2 {
			t.Fatalf("invalid cover must be retried next sync; got %d requests", imageCalls)
		}
		files, err := os.ReadDir(dir)
		if err != nil || len(files) != 1 {
			t.Fatalf("truncated image was retained on disk: files=%v err=%v", files, err)
		}
	}
	body = good
	if err := runOwnerVideosSync(testDB, c, dir); err != nil {
		t.Fatal(err)
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || got.Items[0].CoverPath == oldPath || imageCalls != 4 {
		t.Fatalf("valid retry did not repair cover: %+v err=%v requests=%d", got, err, imageCalls)
	}
	oldBody, err := os.ReadFile(filepath.Join(dir, oldPath))
	if err != nil || !bytes.Equal(oldBody, good) {
		t.Fatal("previous good image was modified")
	}
}

func TestOwnerVideosRevalidatesPreviouslyCachedImage(t *testing.T) {
	dir := t.TempDir()
	good := ownerCoverPNG(t, 2, 2)
	requests := 0
	c := ownerVideoClient(func(*http.Request) (*http.Response, error) {
		requests++
		return ownerVideoResponse(200, string(good)), nil
	})
	cache := func() string {
		t.Helper()
		name, err := cacheOwnerVideoCover(context.Background(), c.http, dir, testOwnerUID, "BV0000000001", "https://i0.hdslb.com/repair.png")
		if err != nil {
			t.Fatal(err)
		}
		return name
	}
	name := cache()
	if err := os.WriteFile(filepath.Join(dir, name), good[:33], 0o600); err != nil {
		t.Fatal(err)
	}
	if repaired := cache(); repaired != name || requests != 2 {
		t.Fatalf("existing truncated cover must be downloaded again: name=%s requests=%d", repaired, requests)
	}
	body, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil || !bytes.Equal(body, good) {
		t.Fatal("truncated cache entry was not repaired")
	}
}

func TestOwnerVideosCoverRequiresCompleteDecodeAndBoundedDimensions(t *testing.T) {
	for _, format := range []string{"jpeg", "png", "gif"} {
		t.Run(format, func(t *testing.T) {
			var body bytes.Buffer
			img := image.NewGray(image.Rect(0, 0, 2, 2))
			var err error
			switch format {
			case "jpeg":
				err = jpeg.Encode(&body, img, nil)
			case "png":
				err = png.Encode(&body, img)
			case "gif":
				err = gif.Encode(&body, img, nil)
			}
			if err != nil {
				t.Fatal(err)
			}
			if !ownerVideoImageContent(body.Bytes()) {
				t.Fatalf("valid %s must be cacheable", format)
			}
			if ownerVideoImageContent(body.Bytes()[:10]) {
				t.Fatalf("truncated %s must not be cached", format)
			}
		})
	}
	for _, size := range []image.Point{{X: 8193, Y: 1}, {X: 4097, Y: 4097}} {
		if ownerVideoImageContent(ownerCoverPNG(t, size.X, size.Y)) {
			t.Fatalf("oversized decoded image accepted: %v", size)
		}
	}
	if ownerVideoImageContent([]byte("RIFF\x04\x00\x00\x00WEBPVP8 ")) {
		t.Fatal("WebP must not be cached without a complete decoder")
	}
}

func TestOwnerVideosGIFRequiresCompleteStream(t *testing.T) {
	frame := image.NewPaletted(image.Rect(0, 0, 2, 2), color.Palette{color.Black, color.White})
	var body bytes.Buffer
	if err := gif.EncodeAll(&body, &gif.GIF{Image: []*image.Paletted{frame, frame}, Delay: []int{1, 1}}); err != nil {
		t.Fatal(err)
	}
	good := body.Bytes()
	if !ownerVideoImageContent(good) {
		t.Fatal("complete small GIF should be cacheable")
	}
	for _, remove := range []int{1, 5} {
		if ownerVideoImageContent(good[:len(good)-remove]) {
			t.Fatalf("GIF missing %d trailing bytes was accepted after decoding only its first frame", remove)
		}
	}
}

func TestOwnerVideosCleanupSerializesWithCoverPreparationAndPublication(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	testDB.SetMaxOpenConns(1)
	dir := t.TempDir()
	good := ownerCoverPNG(t, 2, 2)
	preparing := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(release) })
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.bilibili.com" {
			return ownerVideoResponse(200, ownerVideoPage(1, 1, ownerVideoRow(1))), nil
		}
		close(preparing)
		<-release
		return ownerVideoResponse(200, string(good)), nil
	})
	syncDone := make(chan error, 1)
	go func() { syncDone <- runOwnerVideosSync(testDB, c, dir) }()
	select {
	case <-preparing:
	case <-time.After(3 * time.Second):
		t.Fatal("sync did not reach controlled cover preparation")
	}
	if ownerVideoCacheMu.TryLock() {
		ownerVideoCacheMu.Unlock()
		t.Error("cover preparation through SQLite publication must hold the cache lifecycle mutex")
	}
	cleanupDone := make(chan struct{})
	go func() { cleanupACGCache(testDB, dir, 7*24*time.Hour); close(cleanupDone) }()
	select {
	case <-cleanupDone:
		t.Error("cleanup ran while an unpublished cover was being prepared")
	case <-time.After(30 * time.Millisecond):
	}
	releaseOnce.Do(func() { close(release) })
	select {
	case err := <-syncDone:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("sync/cleanup deadlocked")
	}
	select {
	case <-cleanupDone:
	case <-time.After(3 * time.Second):
		t.Fatal("cleanup did not resume after snapshot publication")
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || len(got.Items) != 1 || !ownerVideoCachedCover(dir, got.Items[0].CoverPath) {
		t.Fatalf("published cover lost after cleanup: %+v err=%v", got, err)
	}
}

func TestOwnerVideosCleanupHoldsMutexWhileReadingReferences(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	testDB.SetMaxOpenConns(1)
	conn, err := testDB.Conn(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	dir := t.TempDir()
	done := make(chan struct{})
	waits := testDB.Stats().WaitCount
	go func() { cleanupACGCache(testDB, dir, 7*24*time.Hour); close(done) }()
	deadline := time.Now().Add(3 * time.Second)
	for testDB.Stats().WaitCount == waits && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if testDB.Stats().WaitCount == waits {
		t.Fatal("cleanup did not reach controlled SQLite reference barrier")
	}
	if ownerVideoCacheMu.TryLock() {
		ownerVideoCacheMu.Unlock()
		t.Error("cleanup must hold the same lifecycle mutex before reading/touching references")
	}
	if err := conn.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("cleanup deadlocked while retaining references")
	}
}

func ownerCacheDiskUsage(t *testing.T, dir string) (int, int64) {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	var files int
	var size int64
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "owner_") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			t.Fatal(err)
		}
		files++
		size += info.Size()
	}
	return files, size
}

func TestOwnerVideosCoverBudgetBoundsGenerationsWithoutEvictingReferences(t *testing.T) {
	good := ownerCoverPNG(t, 2, 2)
	for _, test := range []struct {
		name   string
		budget ownerVideoCoverBudget
	}{
		{"file_count", ownerVideoCoverBudget{MaxBytes: 1 << 20, MaxFiles: 2}},
		{"bytes", ownerVideoCoverBudget{MaxBytes: int64(2 * len(good)), MaxFiles: 1024}},
	} {
		t.Run(test.name, func(t *testing.T) {
			testDB := openOwnerControllerTestDB(t)
			dir := t.TempDir()
			unrelated := filepath.Join(dir, "radar_unrelated.img")
			unrelatedBody := bytes.Repeat([]byte("x"), 2048)
			if err := os.WriteFile(unrelated, unrelatedBody, 0o600); err != nil {
				t.Fatal(err)
			}
			row := ownerVideoRow(1)
			generation := 1
			c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
				if r.URL.Host == "api.bilibili.com" {
					rows := []map[string]any{row}
					if generation >= 3 {
						rows = append(rows, ownerVideoRow(2))
					}
					return ownerVideoResponse(200, ownerVideoPage(1, len(rows), rows...)), nil
				}
				return ownerVideoResponse(200, string(good)), nil
			})
			var firstPath, latestPath string
			for generation = 1; generation <= 6; generation++ {
				row["pic"] = fmt.Sprintf("https://i0.hdslb.com/generation-%d.png", generation)
				if err := runOwnerVideosSyncWithBudget(testDB, c, dir, test.budget); err != nil {
					t.Fatal(err)
				}
				got, err := readOwnerVideos(testDB, testOwnerUID)
				if err != nil {
					t.Fatal(err)
				}
				var current ownerVideo
				for _, item := range got.Items {
					if item.BVID == row["bvid"] {
						current = item
					}
					if item.BVID == ownerVideoRow(2)["bvid"] && (item.CoverPath != "" || item.Cover != item.CoverURL) {
						t.Fatalf("new video over budget must retain remote cover: %+v", item)
					}
				}
				if current.CoverPath == "" || !ownerVideoCachedCover(dir, current.CoverPath) {
					t.Fatalf("current reference became unreadable: %+v", current)
				}
				if generation == 1 {
					firstPath = current.CoverPath
				}
				if generation == 2 {
					latestPath = current.CoverPath
					if latestPath == firstPath {
						t.Fatal("second URL should fit remaining budget")
					}
					old := time.Now().Add(-8 * 24 * time.Hour)
					if err := os.Chtimes(filepath.Join(dir, firstPath), old, old); err != nil {
						t.Fatal(err)
					}
				}
				if generation >= 3 && current.CoverPath != latestPath {
					t.Fatalf("quota exhausted but current good reference changed: %+v", current)
				}
				files, size := ownerCacheDiskUsage(t, dir)
				if files > test.budget.MaxFiles || size > test.budget.MaxBytes {
					t.Fatalf("owner cache exceeded quota: files=%d bytes=%d budget=%+v", files, size, test.budget)
				}
			}
			if files, _ := ownerCacheDiskUsage(t, dir); files != 2 {
				t.Fatalf("old generations must still count toward quota, files=%d", files)
			}
			otherBody, err := os.ReadFile(unrelated)
			if err != nil || !bytes.Equal(otherBody, unrelatedBody) {
				t.Fatal("owner quota modified another ACG cache file")
			}
			cleanupACGCache(testDB, dir, 7*24*time.Hour)
			if !ownerVideoCachedCover(dir, latestPath) {
				t.Fatal("cleanup removed the current reference while reclaiming an expired orphan")
			}
			if _, err := os.Stat(filepath.Join(dir, firstPath)); !os.IsNotExist(err) {
				t.Fatal("expired unreferenced generation was not reclaimed")
			}
			row["pic"] = "https://i0.hdslb.com/after-cleanup.png"
			if err := runOwnerVideosSyncWithBudget(testDB, c, dir, test.budget); err != nil {
				t.Fatal(err)
			}
			got, err := readOwnerVideos(testDB, testOwnerUID)
			if err != nil {
				t.Fatal(err)
			}
			for _, item := range got.Items {
				if item.BVID == row["bvid"] && (item.CoverPath == latestPath || !ownerVideoCachedCover(dir, item.CoverPath)) {
					t.Fatalf("reclaimed budget was not usable: %+v", item)
				}
			}
		})
	}
}

func TestOwnerVideosCoverBudgetCountsAllOwners(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	dir := t.TempDir()
	good := ownerCoverPNG(t, 2, 2)
	c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.bilibili.com" {
			return ownerVideoResponse(200, ownerVideoPage(1, 1, ownerVideoRow(1))), nil
		}
		return ownerVideoResponse(200, string(good)), nil
	})
	other := seedOwnerVideoSnapshot(t, "42")
	name, err := cacheOwnerVideoCover(context.Background(), c.http, dir, "42", other.Items[0].BVID, other.Items[0].CoverURL)
	if err != nil {
		t.Fatal(err)
	}
	other.Items[0].CoverPath = name
	if err := replaceOwnerVideos(testDB, other); err != nil {
		t.Fatal(err)
	}
	budget := ownerVideoCoverBudget{MaxBytes: int64(len(good)), MaxFiles: 1}
	if err := runOwnerVideosSyncWithBudget(testDB, c, dir, budget); err != nil {
		t.Fatal(err)
	}
	got, err := readOwnerVideos(testDB, testOwnerUID)
	if err != nil || len(got.Items) != 1 || got.Items[0].CoverPath != "" || got.Items[0].Cover != got.Items[0].CoverURL {
		t.Fatalf("another owner's cover was not counted toward quota: %+v err=%v", got, err)
	}
	cachedOther, err := readOwnerVideos(testDB, "42")
	if err != nil || cachedOther.Items[0].CoverPath != name || !ownerVideoCachedCover(dir, name) {
		t.Fatalf("quota evicted another owner's current reference: %+v err=%v", cachedOther, err)
	}
}

func TestOwnerVideosConcurrentBudgetsCannotOverbook(t *testing.T) {
	testDB := openOwnerControllerTestDB(t)
	testDB.SetMaxOpenConns(1)
	dir := t.TempDir()
	good := ownerCoverPNG(t, 2, 2)
	ready := make(chan struct{}, 2)
	release := make(chan struct{})
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(release) })
	var downloads atomic.Int64
	done := make(chan error, 2)
	budget := ownerVideoCoverBudget{MaxBytes: int64(len(good)), MaxFiles: 1}
	for _, uid := range []string{testOwnerUID, "42"} {
		row := ownerVideoRow(1)
		if uid == "42" {
			row["mid"] = 42
		}
		c := ownerVideoClient(func(r *http.Request) (*http.Response, error) {
			if r.URL.Host == "api.bilibili.com" {
				ready <- struct{}{}
				<-release
				return ownerVideoResponse(200, ownerVideoPage(1, 1, row)), nil
			}
			downloads.Add(1)
			return ownerVideoResponse(200, string(good)), nil
		})
		c.cfg.BilibiliUID = uid
		go func() { done <- runOwnerVideosSyncWithBudget(testDB, c, dir, budget) }()
	}
	for i := 0; i < 2; i++ {
		select {
		case <-ready:
		case <-time.After(3 * time.Second):
			t.Fatal("archive fetching must not hold the cache lifecycle mutex")
		}
	}
	releaseOnce.Do(func() { close(release) })
	for i := 0; i < 2; i++ {
		select {
		case err := <-done:
			if err != nil {
				t.Fatal(err)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("concurrent quota syncs did not finish")
		}
	}
	files, size := ownerCacheDiskUsage(t, dir)
	if files != 1 || size != int64(len(good)) || downloads.Load() != 1 {
		t.Fatalf("concurrent writers overbooked quota: files=%d bytes=%d downloads=%d", files, size, downloads.Load())
	}
	local := 0
	for _, uid := range []string{testOwnerUID, "42"} {
		got, err := readOwnerVideos(testDB, uid)
		if err != nil || !got.Ready || len(got.Items) != 1 {
			t.Fatalf("missing published snapshot for %s: %+v err=%v", uid, got, err)
		}
		if got.Items[0].CoverPath != "" {
			local++
			if !ownerVideoCachedCover(dir, got.Items[0].CoverPath) {
				t.Fatal("concurrent sync published unreadable cover")
			}
		} else if got.Items[0].Cover != got.Items[0].CoverURL {
			t.Fatal("uncached cover must retain safe remote URL")
		}
	}
	if local != 1 {
		t.Fatalf("expected exactly one cached cover under shared quota, got %d", local)
	}
}
