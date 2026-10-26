package main

import (
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// Keep the pool small so almost every draw lands on a row whose preview was
	// already warmed; a 1000-row pool means most draws hit a cold upstream cache.
	wallpaperAPIMaxItems        = 120
	wallpaperAPIRefreshCount    = 10
	wallpaperHTTPClientTimeout  = 20 * time.Second
	wallpaperWarmClientTimeout  = 8 * time.Second
	wallpaperWarmReferer        = "https://taozhiyy.top/"
	wallpaperWarmMaxBytes       = 2 << 20
	wallpaperUpstreamSource     = "lolicon"
	wallpaperUpstreamImageProxy = "i.pixiv.re"
)

var fallbackWallpaperItems = []wallpaperItem{
	{
		ID:          "fallback-ai-blog-0e7e10e2acdb398941c10735a791918d",
		URL:         "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/0e7e10e2acdb398941c10735a791918d.jpg",
		PreviewURL:  "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/0e7e10e2acdb398941c10735a791918d.jpg",
		Source:      "local-gallery",
		Author:      "taozhiyy",
		SourceURL:   "https://taozhiyy.top/gallery",
		LicenseNote: "Local gallery fallback",
		Kind:        "fallback",
		Status:      "active",
	},
	{
		ID:          "fallback-misaka-915cdb4184d77e9d06e789755f30f792",
		URL:         "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/%E6%97%8B%E8%BD%AC%E7%9B%B8%E5%86%8C%E5%BE%A1%E5%9D%82%E7%BE%8E%E7%90%B4/915cdb4184d77e9d06e789755f30f792.jpg",
		PreviewURL:  "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/%E6%97%8B%E8%BD%AC%E7%9B%B8%E5%86%8C%E5%BE%A1%E5%9D%82%E7%BE%8E%E7%90%B4/915cdb4184d77e9d06e789755f30f792.jpg",
		Source:      "local-gallery",
		Author:      "taozhiyy",
		SourceURL:   "https://taozhiyy.top/gallery/misaka",
		LicenseNote: "Local gallery fallback",
		Kind:        "fallback",
		Status:      "active",
	},
}

type wallpaperItem struct {
	ID          string    `json:"id"`
	URL         string    `json:"url"`
	PreviewURL  string    `json:"previewUrl,omitempty"`
	Source      string    `json:"source"`
	Author      string    `json:"author,omitempty"`
	SourceURL   string    `json:"sourceUrl,omitempty"`
	LicenseNote string    `json:"licenseNote,omitempty"`
	Kind        string    `json:"kind"`
	Status      string    `json:"status,omitempty"`
	AddedAt     time.Time `json:"addedAt"`
}

func startWallpaperPoolLoop(db *sql.DB) {
	go func() {
		runWallpaperPoolSync(db)
		t := time.NewTicker(1 * time.Hour)
		for range t.C {
			runWallpaperPoolSync(db)
		}
	}()
}

func runWallpaperPoolSync(db *sql.DB) {
	// Retire sources that are no longer reachable before touching upstream, so a
	// failing fetch can never keep dead image links live.
	if err := deactivateWallpaperSourcesOutside(db, enabledWallpaperSources); err != nil {
		log.Println("sync: wallpaper retire error:", err)
		return
	}
	items, err := fetchLegalWallpaperItems(wallpaperAPIRefreshCount)
	if err != nil {
		log.Println("sync: wallpaper fetch skipped:", err)
		return
	}
	if len(items) == 0 {
		log.Println("sync: wallpaper fetch returned empty list; keeping cached pool")
		return
	}
	if err := insertWallpaperItems(db, items, time.Now().UTC()); err != nil {
		log.Println("sync: wallpaper db error:", err)
		return
	}
	warmWallpaperPreviews(items)
	log.Printf("sync: wallpaper done (%d new candidates)\n", len(items))
}

func fetchLegalWallpaperItems(limit int) ([]wallpaperItem, error) {
	return fetchLoliconWallpapers(limit)
}

// warmWallpaperPreviews pulls each new preview image once so the upstream mirror
// has it cached before a visitor draws it. The mirror fetches from Pixiv on first
// request, which costs several seconds; warming turns that into server-side
// inbound traffic instead of visitor waiting time.
func warmWallpaperPreviews(items []wallpaperItem) {
	warmWallpaperPreviewsWith(&http.Client{Timeout: wallpaperWarmClientTimeout}, items)
}

func warmWallpaperPreviewsWith(client *http.Client, items []wallpaperItem) {
	for _, item := range items {
		link := firstWallpaperValue(item.PreviewURL, item.URL)
		if !strings.HasPrefix(link, "https://") {
			continue
		}
		req, err := http.NewRequest(http.MethodGet, link, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "taozhiyy-wallpaper-pool/1.0")
		req.Header.Set("Referer", wallpaperWarmReferer)
		res, err := client.Do(req)
		if err != nil {
			log.Println("sync: wallpaper warm skipped:", err)
			continue
		}
		_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, wallpaperWarmMaxBytes))
		res.Body.Close()
	}
}

// enabledWallpaperSources lists the upstream sources still worth drawing from.
// Rows from any retired source are deactivated so dead links never reach visitors.
var enabledWallpaperSources = []string{wallpaperUpstreamSource}

func deactivateWallpaperSourcesOutside(db *sql.DB, enabled []string) error {
	if len(enabled) == 0 {
		return nil
	}
	placeholders := make([]string, len(enabled))
	args := make([]any, len(enabled))
	for i, source := range enabled {
		placeholders[i] = "?"
		args[i] = source
	}
	_, err := db.Exec(
		`UPDATE wallpaper_pool SET status='inactive'
		 WHERE kind='api' AND status='active' AND source NOT IN (`+strings.Join(placeholders, ",")+`)`,
		args...,
	)
	return err
}

type loliconSearchResponse struct {
	Error string        `json:"error"`
	Data  []loliconItem `json:"data"`
}

type loliconImageURLs struct {
	Original string `json:"original"`
	Regular  string `json:"regular"`
	Small    string `json:"small"`
	Thumb    string `json:"thumb"`
}

type loliconItem struct {
	PID    int              `json:"pid"`
	P      int              `json:"p"`
	UID    int              `json:"uid"`
	Title  string           `json:"title"`
	Author string           `json:"author"`
	R18    bool             `json:"r18"`
	Width  int              `json:"width"`
	Height int              `json:"height"`
	URLs   loliconImageURLs `json:"urls"`
}

// fetchLoliconWallpapers pulls landscape SFW illustrations from the Lolicon API.
// Images are referenced through the i.pixiv.re mirror, which returns usable
// bytes even with a foreign Referer, so the browser can load them directly
// without the backend proxying or re-hosting anything.
func fetchLoliconWallpapers(limit int) ([]wallpaperItem, error) {
	endpoint := buildLoliconWallpaperEndpoint(limit)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "taozhiyy-wallpaper-pool/1.0")
	req.Header.Set("Accept", "application/json")

	var body loliconSearchResponse
	if err := doWallpaperJSON(req, &body); err != nil {
		return nil, err
	}
	if strings.TrimSpace(body.Error) != "" {
		return nil, errors.New("lolicon: " + body.Error)
	}

	now := time.Now().UTC()
	items := make([]wallpaperItem, 0, len(body.Data))
	for _, image := range body.Data {
		item, ok := loliconItemToWallpaperItem(image, now)
		if !ok {
			continue
		}
		items = append(items, item)
	}
	if len(items) == 0 {
		return nil, errors.New("lolicon returned no eligible landscape images")
	}
	return items, nil
}

func buildLoliconWallpaperEndpoint(limit int) string {
	if limit <= 0 {
		limit = 1
	}
	query := url.Values{}
	query.Set("num", fmt.Sprint(limit))
	query.Set("r18", "0")
	query.Set("size", "regular")
	query.Set("aspect_ratio", "horizontal")
	query.Set("proxy", wallpaperUpstreamImageProxy)
	return "https://api.lolicon.app/setu/v2?" + query.Encode()
}

func loliconItemToWallpaperItem(image loliconItem, now time.Time) (wallpaperItem, bool) {
	if image.R18 {
		return wallpaperItem{}, false
	}
	regular := firstWallpaperValue(image.URLs.Regular, image.URLs.Original, image.URLs.Small)
	if strings.TrimSpace(regular) == "" {
		return wallpaperItem{}, false
	}
	if image.Width > 0 && image.Height > 0 && image.Width <= image.Height {
		return wallpaperItem{}, false
	}
	preview := firstWallpaperValue(image.URLs.Small, regular)
	author := firstWallpaperValue(image.Author, "Pixiv")
	sourceURL := "https://api.lolicon.app/"
	if image.PID > 0 {
		sourceURL = fmt.Sprintf("https://www.pixiv.net/artworks/%d", image.PID)
	}
	return wallpaperItem{
		ID:          stableWallpaperID(wallpaperUpstreamSource, fmt.Sprintf("%d-%d", image.PID, image.P), regular),
		URL:         regular,
		PreviewURL:  preview,
		Source:      wallpaperUpstreamSource,
		Author:      author,
		SourceURL:   sourceURL,
		LicenseNote: "Pixiv artwork served through the Lolicon API",
		Kind:        "api",
		Status:      "active",
		AddedAt:     now,
	}, true
}

func doWallpaperJSON(req *http.Request, out any) error {
	client := &http.Client{Timeout: wallpaperHTTPClientTimeout}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("http %d", res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(out)
}

func insertWallpaperItems(db *sql.DB, items []wallpaperItem, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, item := range items {
		if item.URL == "" || item.ID == "" {
			continue
		}
		if item.Kind == "" {
			item.Kind = "api"
		}
		if item.Status == "" {
			item.Status = "active"
		}
		if item.AddedAt.IsZero() {
			item.AddedAt = now
		}
		_, err := tx.Exec(
			`INSERT INTO wallpaper_pool
			 (id, url, preview_url, source, author, source_url, license_note, kind, status, added_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO NOTHING`,
			item.ID, item.URL, item.PreviewURL, item.Source, item.Author, item.SourceURL,
			item.LicenseNote, item.Kind, item.Status, item.AddedAt.Format(time.RFC3339),
		)
		if err != nil {
			return err
		}
	}
	if err := pruneAPIWallpaperItems(tx, wallpaperAPIMaxItems); err != nil {
		return err
	}
	return tx.Commit()
}

func pruneAPIWallpaperItems(tx *sql.Tx, maxItems int) error {
	var count int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM wallpaper_pool WHERE kind='api'`).Scan(&count); err != nil {
		return err
	}
	over := count - maxItems
	if over <= 0 {
		return nil
	}
	_, err := tx.Exec(
		`DELETE FROM wallpaper_pool
		 WHERE id IN (
		   SELECT id FROM wallpaper_pool
		   WHERE kind='api'
		   ORDER BY added_at ASC, id ASC
		   LIMIT ?
		 )`,
		over,
	)
	return err
}

func drawWallpaperItem(db *sql.DB) (wallpaperItem, error) {
	row := db.QueryRow(
		`SELECT id, url, preview_url, source, author, source_url, license_note, kind, status, added_at
		 FROM wallpaper_pool
		 WHERE status='active'
		 ORDER BY RANDOM()
		 LIMIT 1`,
	)
	var item wallpaperItem
	var addedAt string
	if err := row.Scan(&item.ID, &item.URL, &item.PreviewURL, &item.Source, &item.Author, &item.SourceURL, &item.LicenseNote, &item.Kind, &item.Status, &addedAt); err != nil {
		return item, err
	}
	if parsed, err := time.Parse(time.RFC3339, addedAt); err == nil {
		item.AddedAt = parsed
	}
	_, _ = db.Exec(`UPDATE wallpaper_pool SET last_drawn_at=? WHERE id=?`, time.Now().UTC().Format(time.RFC3339), item.ID)
	return item, nil
}

func drawAPIWallpaperItem(db *sql.DB) (wallpaperItem, error) {
	row := db.QueryRow(
		`SELECT id, url, preview_url, source, author, source_url, license_note, kind, status, added_at
		 FROM wallpaper_pool
		 WHERE status='active' AND kind='api'
		 ORDER BY RANDOM()
		 LIMIT 1`,
	)
	var item wallpaperItem
	var addedAt string
	if err := row.Scan(&item.ID, &item.URL, &item.PreviewURL, &item.Source, &item.Author, &item.SourceURL, &item.LicenseNote, &item.Kind, &item.Status, &addedAt); err != nil {
		return item, err
	}
	if parsed, err := time.Parse(time.RFC3339, addedAt); err == nil {
		item.AddedAt = parsed
	}
	_, _ = db.Exec(`UPDATE wallpaper_pool SET last_drawn_at=? WHERE id=?`, time.Now().UTC().Format(time.RFC3339), item.ID)
	return item, nil
}

func fallbackWallpaperItem() wallpaperItem {
	item := fallbackWallpaperItems[rand.Intn(len(fallbackWallpaperItems))]
	item.AddedAt = time.Now().UTC()
	return item
}

func apiFallbackWallpaperItem() wallpaperItem {
	seed := time.Now().UTC().Format("20060102150405")
	return wallpaperItem{
		ID:          "external-api-placeholder-" + seed,
		URL:         "https://picsum.photos/seed/taozhiyy-" + seed + "/1920/1080",
		PreviewURL:  "https://picsum.photos/seed/taozhiyy-" + seed + "/960/540",
		Source:      "external-api-placeholder",
		Author:      "Lorem Picsum",
		SourceURL:   "https://picsum.photos/",
		LicenseNote: "External API placeholder; configure PEXELS_API_KEY or PIXABAY_API_KEY for licensed provider images.",
		Kind:        "api",
		Status:      "active",
		AddedAt:     time.Now().UTC(),
	}
}

func stableWallpaperID(source, upstreamID, imageURL string) string {
	sum := sha1.Sum([]byte(strings.Join([]string{source, upstreamID, imageURL}, "|")))
	return source + "-" + hex.EncodeToString(sum[:])[:16]
}

func firstWallpaperValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
