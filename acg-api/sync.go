package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var downloadSem = make(chan struct{}, 2)

type bangumiItem struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Watched       int    `json:"watched"`
	Total         int    `json:"total"`
	LatestEpisode int    `json:"latestEpisode"`
	CoverURL      string `json:"coverUrl,omitempty"`
	CoverPath     string `json:"-"`
	LinkURL       string `json:"linkUrl,omitempty"`
}

type radarItem struct {
	ID          string `json:"id"`
	UpUID       string `json:"-"`
	CreatorName string `json:"creatorName"`
	LatestText  string `json:"latestText"`
	IsNew       bool   `json:"isNew"`
	LinkURL     string `json:"linkUrl,omitempty"`
	CoverURL    string `json:"coverUrl,omitempty"`
	CoverPath   string `json:"-"`
	PublishedAt string `json:"-"`
}

func startSyncLoops(db *sql.DB, cfg AppConfig, cacheDir string) {
	bili := NewBiliClient(cfg)
	_ = upsertRadarCreators(db, cfg.RadarCreators)

	go func() {
		runSyncJob("startup", func() {
			_ = runOwnerVideosSync(db, bili, cacheDir)
			runBangumiSync(db, bili, cacheDir)
			runRadarSync(db, bili, cfg, cacheDir)
		})
		hourly := time.NewTicker(time.Hour)
		radar := time.NewTicker(15 * time.Minute)
		defer hourly.Stop()
		defer radar.Stop()
		for {
			select {
			case <-hourly.C:
				runSyncJob("owner videos and bangumi", func() {
					_ = runOwnerVideosSync(db, bili, cacheDir)
					runBangumiSync(db, bili, cacheDir)
				})
			case <-radar.C:
				runSyncJob("radar", func() { runRadarSync(db, bili, cfg, cacheDir) })
			}
		}
	}()
}

func runSyncJob(name string, run func()) {
	if tryRunSyncJob(run) {
		return
	}
	log.Printf("sync: %s waiting for active sync", name)
	for !tryRunSyncJob(run) {
		time.Sleep(100 * time.Millisecond)
	}
}

func runBangumiSync(db *sql.DB, bili *BiliClient, cacheDir string) {
	log.Println("sync: bangumi start")
	items, err := bili.FetchBangumi(1, 30)
	if err != nil {
		log.Println("sync: bangumi fetch error:", err)
		return
	}
	if len(items) == 0 {
		log.Println("sync: bangumi fetch returned empty list; keeping cached data")
		return
	}
	for i := range items {
		if items[i].CoverURL == "" {
			continue
		}
		fname := items[i].ID + ".jpg"
		if err := downloadToCache(items[i].CoverURL, filepath.Join(cacheDir, fname)); err != nil {
			log.Println("sync: cover", items[i].ID, err)
			continue
		}
		items[i].CoverPath = fname
	}
	if err := replaceBangumiItems(db, items); err != nil {
		log.Println("sync: bangumi db error:", err)
		return
	}
	log.Printf("sync: bangumi done (%d items)\n", len(items))
}

func runRadarSync(db *sql.DB, bili *BiliClient, cfg AppConfig, cacheDir string) {
	log.Println("sync: radar start")
	now := time.Now()
	synced := 0
	for _, creator := range cfg.RadarCreators {
		vid, err := bili.FetchLatestVideo(creator.UID)
		if err != nil {
			log.Println("sync: radar", creator.Name, err)
			continue
		}
		published := time.Unix(vid.Created, 0)
		isNew := now.Sub(published) <= 24*time.Hour
		coverFile := ""
		if vid.Pic != "" {
			coverFile = "radar_" + creator.UID + ".jpg"
			_ = downloadToCache(vid.Pic, filepath.Join(cacheDir, coverFile))
		}
		item := radarItem{
			ID:          "r_" + creator.UID,
			UpUID:       creator.UID,
			CreatorName: "UP · " + creator.Name,
			LatestText:  vid.Title,
			IsNew:       isNew,
			LinkURL:     vid.LinkURL,
			CoverPath:   coverFile,
			PublishedAt: published.UTC().Format(time.RFC3339),
		}
		if err := upsertRadarFeed(db, item); err != nil {
			log.Println("sync: radar db", creator.Name, err)
			continue
		}
		synced++
	}
	if synced > 0 {
		_, _ = db.Exec(`DELETE FROM radar_feed WHERE id LIKE 'seed_%'`)
	}
	log.Println("sync: radar done")
}

func downloadToCache(remoteURL, dest string) error {
	if remoteURL == "" {
		return fmt.Errorf("empty url")
	}
	downloadSem <- struct{}{}
	defer func() { <-downloadSem }()

	req, err := http.NewRequest(http.MethodGet, remoteURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", biliUA)
	req.Header.Set("Referer", "https://www.bilibili.com")
	client := &http.Client{Timeout: biliHTTPTimeout()}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("http %d", res.StatusCode)
	}
	tmp := dest + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	_, err = io.Copy(f, res.Body)
	closeErr := f.Close()
	if err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if closeErr != nil {
		_ = os.Remove(tmp)
		return closeErr
	}
	return os.Rename(tmp, dest)
}

func cleanupCache(cacheDir string, maxAge time.Duration) {
	entries, err := os.ReadDir(cacheDir)
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-maxAge)
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(cacheDir, e.Name()))
		}
	}
}

func safeImageName(name string) bool {
	if name == "" || strings.Contains(name, "..") {
		return false
	}
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || r == '.' {
			continue
		}
		return false
	}
	return true
}
