package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"fmt"
	"image"
	"image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var ownerVideoCacheMu sync.Mutex

const (
	ownerVideoMaxCoverBytes     = 8 * 1024 * 1024
	ownerVideoMaxCoverDimension = 8192
	ownerVideoMaxCoverPixels    = 16 * 1024 * 1024
)

func cleanupACGCache(db *sql.DB, dir string, maxAge time.Duration) {
	ownerVideoCacheMu.Lock()
	defer ownerVideoCacheMu.Unlock()
	if err := retainOwnerVideoCovers(db, dir); err != nil {
		log.Println("cache: keeping files; owner video references unavailable:", err)
		return
	}
	cleanupCache(dir, maxAge)
}

// The caller holds ownerVideoCacheMu through both reference retention and cleanup.
func retainOwnerVideoCovers(db *sql.DB, dir string) error {
	rows, err := db.Query(`SELECT cover_path FROM bili_owner_videos WHERE cover_path <> ''`)
	if err != nil {
		return err
	}
	defer rows.Close()
	now := time.Now()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		if !safeImageName(name) {
			continue
		}
		if err := os.Chtimes(filepath.Join(dir, name), now, now); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return rows.Err()
}

func ownerVideoImageContent(body []byte) bool {
	if len(body) == 0 || len(body) > ownerVideoMaxCoverBytes {
		return false
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(body))
	if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > ownerVideoMaxCoverDimension ||
		cfg.Height > ownerVideoMaxCoverDimension || int64(cfg.Width)*int64(cfg.Height) > ownerVideoMaxCoverPixels {
		return false
	}
	switch format {
	case "gif":
		// Every frame needs at least a ten-byte image descriptor. Bound total
		// frame allocation before asking the standard decoder to read all frames.
		maxFrames := int64(len(body))/10 + 1
		if int64(cfg.Width)*int64(cfg.Height)*maxFrames > ownerVideoMaxCoverPixels {
			return false
		}
		_, err := gif.DecodeAll(bytes.NewReader(body))
		return err == nil
	case "jpeg", "png":
	default:
		return false
	}
	_, decodedFormat, err := image.Decode(bytes.NewReader(body))
	return err == nil && decodedFormat == format
}

func ownerVideoCachedCover(dir, name string) bool {
	if !safeImageName(name) {
		return false
	}
	f, err := os.Open(filepath.Join(dir, name))
	if err != nil {
		return false
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() == 0 || info.Size() > ownerVideoMaxCoverBytes {
		return false
	}
	body, err := readOwnerVideoBody(f, ownerVideoMaxCoverBytes)
	return err == nil && ownerVideoImageContent(body)
}

func cacheOwnerVideoCover(ctx context.Context, client *http.Client, dir, uid, bvid, remoteURL string) (string, error) {
	ownerVideoCacheMu.Lock()
	defer ownerVideoCacheMu.Unlock()
	quota, err := newOwnerVideoCoverQuota(dir, ownerVideoCoverBudget{MaxBytes: ownerVideoCacheMaxBytes, MaxFiles: ownerVideoCacheMaxFiles})
	if err != nil {
		return "", err
	}
	return cacheOwnerVideoCoverLocked(ctx, client, dir, uid, bvid, remoteURL, quota)
}

func cacheOwnerVideoCoverLocked(ctx context.Context, client *http.Client, dir, uid, bvid, remoteURL string, quota *ownerVideoCoverQuota) (string, error) {
	if !validOwnerVideoUID(uid) || !ownerVideoBVIDRE.MatchString(bvid) || !safeOwnerVideoCover(remoteURL) {
		return "", fmt.Errorf("unsafe owner video cover")
	}
	hash := sha256.Sum256([]byte(remoteURL))
	name := fmt.Sprintf("owner_%s_%s_%x.img", uid, bvid, hash[:16])
	dest := filepath.Join(dir, name)
	if ownerVideoCachedCover(dir, name) {
		_ = os.Chtimes(dest, time.Now(), time.Now())
		return name, nil
	}
	limit := quota.downloadLimit(name)
	if limit <= 0 {
		return "", fmt.Errorf("owner cover cache quota exhausted")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, remoteURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", biliUA)
	req.Header.Set("Referer", "https://www.bilibili.com/")
	res, err := ownerVideoHTTPClient(client).Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("owner cover HTTP %d", res.StatusCode)
	}
	body, err := readOwnerVideoBody(res.Body, limit)
	if err != nil {
		return "", err
	}
	if !ownerVideoImageContent(body) {
		return "", fmt.Errorf("owner cover is not an image")
	}
	f, err := os.CreateTemp(dir, ".owner-cover-*.part")
	if err != nil {
		return "", err
	}
	defer os.Remove(f.Name())
	_, writeErr := f.Write(body)
	closeErr := f.Close()
	if writeErr != nil {
		return "", writeErr
	}
	if closeErr != nil {
		return "", closeErr
	}
	if err := os.Rename(f.Name(), dest); err != nil {
		return "", err
	}
	quota.record(name, int64(len(body)))
	return name, nil
}

func runOwnerVideosSync(db *sql.DB, c *BiliClient, dir string) error {
	return runOwnerVideosSyncWithBudget(db, c, dir, ownerVideoCoverBudget{MaxBytes: ownerVideoCacheMaxBytes, MaxFiles: ownerVideoCacheMaxFiles})
}

func runOwnerVideosSyncWithBudget(db *sql.DB, c *BiliClient, dir string, budget ownerVideoCoverBudget) (syncErr error) {
	log.Println("sync: owner videos start")
	defer func() {
		if syncErr != nil {
			log.Println("sync: owner videos keeping cached snapshot:", syncErr)
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), ownerVideoSyncTimeout)
	defer cancel()
	snapshot, err := c.FetchOwnerVideos(ctx)
	if err != nil {
		return err
	}
	ownerVideoCacheMu.Lock()
	defer ownerVideoCacheMu.Unlock()
	previous, err := readOwnerVideos(db, c.cfg.BilibiliUID)
	if err != nil {
		return err
	}
	if snapshot.Owner.Name == "" {
		snapshot.Owner.Name = previous.Owner.Name
	}
	oldCovers := make(map[string]string, len(previous.Items))
	for _, item := range previous.Items {
		oldCovers[item.BVID] = item.CoverPath
	}
	quota, quotaErr := newOwnerVideoCoverQuota(dir, budget)
	for i := range snapshot.Items {
		item := &snapshot.Items[i]
		var name string
		err := quotaErr
		if err == nil {
			name, err = cacheOwnerVideoCoverLocked(ctx, c.http, dir, snapshot.Owner.UID, item.BVID, item.CoverURL, quota)
		}
		if err != nil {
			log.Printf("sync: owner cover %s: %v", item.BVID, err)
			name = oldCovers[item.BVID]
			if !ownerVideoCachedCover(dir, name) {
				name = ""
			} else {
				_ = os.Chtimes(filepath.Join(dir, name), time.Now(), time.Now())
			}
		}
		item.CoverPath = name
	}
	snapshot.SyncedAt = time.Now().UTC().Format(time.RFC3339Nano)
	if err := replaceOwnerVideos(db, snapshot); err != nil {
		return err
	}
	log.Printf("sync: owner videos done (%d items)", len(snapshot.Items))
	return nil
}
