package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	ownerVideoPageSize    = 30
	ownerVideoMaxPages    = 100
	ownerVideoMaxBody     = 2 * 1024 * 1024
	ownerVideoHTTPTimeout = 10 * time.Second
	ownerVideoSyncTimeout = 2 * time.Minute
)

var (
	ownerVideoUIDRE      = regexp.MustCompile(`^[1-9][0-9]{0,18}$`)
	ownerVideoBVIDRE     = regexp.MustCompile(`^BV[0-9A-Za-z]{10}$`)
	ownerVideoDurationRE = regexp.MustCompile(`^(?:[0-9]{1,4}:[0-5][0-9]|[0-9]{1,4}:[0-5][0-9]:[0-5][0-9])$`)
	ownerVideoCDNRE      = regexp.MustCompile(`^i[0-9]+\.hdslb\.com$`)
)

type ownerVideoSyncError struct {
	reason string
	code   *int
	cause  error
}

func (e *ownerVideoSyncError) Error() string {
	if e.code != nil {
		return fmt.Sprintf("owner video sync %s (code=%d)", e.reason, *e.code)
	}
	return "owner video sync " + e.reason
}

func (e *ownerVideoSyncError) Unwrap() error { return e.cause }

func validOwnerVideoUID(uid string) bool {
	if !ownerVideoUIDRE.MatchString(uid) {
		return false
	}
	_, err := strconv.ParseInt(uid, 10, 64)
	return err == nil
}

func safeOwnerVideoCover(rawURL string) bool {
	u, err := url.Parse(rawURL)
	return err == nil && len(rawURL) <= 4096 && u.Scheme == "https" && u.User == nil &&
		u.Fragment == "" && u.Path != "" && (u.Port() == "" || u.Port() == "443") &&
		ownerVideoCDNRE.MatchString(strings.ToLower(u.Hostname()))
}

func normalizeOwnerVideoCover(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	if u.Scheme == "http" || (u.Scheme == "" && strings.HasPrefix(rawURL, "//")) {
		u.Scheme = "https"
	}
	cover := u.String()
	if !safeOwnerVideoCover(cover) {
		return ""
	}
	return cover
}

func ownerVideoHTTPClient(client *http.Client) *http.Client {
	bounded := *client
	if bounded.Timeout <= 0 || bounded.Timeout > ownerVideoHTTPTimeout {
		bounded.Timeout = ownerVideoHTTPTimeout
	}
	bounded.Jar = nil
	bounded.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return &bounded
}

func readOwnerVideoBody(body io.Reader, limit int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("response exceeds %d bytes", limit)
	}
	return data, nil
}

type ownerArchiveVideo struct {
	BVID        string  `json:"bvid"`
	MID         *int64  `json:"mid"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Pic         string  `json:"pic"`
	Created     int64   `json:"created"`
	Length      string  `json:"length"`
	Author      string  `json:"author"`
}

type ownerArchivePage struct {
	Code *int `json:"code"`
	Data *struct {
		Page *struct {
			PN    int  `json:"pn"`
			PS    int  `json:"ps"`
			Count *int `json:"count"`
		} `json:"page"`
		List *struct {
			VList *[]ownerArchiveVideo `json:"vlist"`
		} `json:"list"`
	} `json:"data"`
}

func (c *BiliClient) fetchOwnerVideoPage(ctx context.Context, page int) (ownerArchivePage, error) {
	var payload ownerArchivePage
	query := url.Values{
		"mid": {c.cfg.BilibiliUID}, "ps": {strconv.Itoa(ownerVideoPageSize)},
		"pn": {strconv.Itoa(page)}, "order": {"pubdate"},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.bilibili.com/x/space/arc/search?"+query.Encode(), nil)
	if err != nil {
		return payload, err
	}
	req.Header.Set("User-Agent", biliUA)
	req.Header.Set("Referer", "https://space.bilibili.com/"+c.cfg.BilibiliUID+"/")
	res, err := ownerVideoHTTPClient(c.http).Do(req)
	if err != nil {
		return payload, &ownerVideoSyncError{reason: "network_error", cause: err}
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return payload, &ownerVideoSyncError{reason: "upstream_rejected", code: &res.StatusCode}
	}
	body, err := readOwnerVideoBody(res.Body, ownerVideoMaxBody)
	if err != nil {
		reason := "invalid_response"
		var networkErr net.Error
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) || errors.As(err, &networkErr) {
			reason = "network_error"
		}
		return payload, &ownerVideoSyncError{reason: reason, cause: err}
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return payload, fmt.Errorf("owner archive JSON: %w", err)
	}
	if payload.Code == nil {
		return payload, fmt.Errorf("owner archive missing API code")
	}
	if *payload.Code != 0 {
		return payload, &ownerVideoSyncError{reason: "upstream_rejected", code: payload.Code}
	}
	if payload.Data == nil || payload.Data.Page == nil || payload.Data.Page.Count == nil ||
		payload.Data.List == nil || payload.Data.List.VList == nil {
		return payload, fmt.Errorf("owner archive missing required data")
	}
	if payload.Data.Page.PN != page || payload.Data.Page.PS != ownerVideoPageSize {
		return payload, fmt.Errorf("owner archive pagination mismatch")
	}
	return payload, nil
}

func (c *BiliClient) FetchOwnerVideos(ctx context.Context) (ownerVideosSnapshot, error) {
	snapshot := ownerVideosSnapshot{
		Owner: biliVideoOwner{UID: c.cfg.BilibiliUID, ProfileURL: "https://space.bilibili.com/" + c.cfg.BilibiliUID + "/"},
		Items: []ownerVideo{},
	}
	if !validOwnerVideoUID(c.cfg.BilibiliUID) {
		return snapshot, fmt.Errorf("invalid configured owner UID")
	}
	ctx, cancel := context.WithTimeout(ctx, ownerVideoSyncTimeout)
	defer cancel()
	count := -1
	seen := make(map[string]bool)
	for page := 1; page <= ownerVideoMaxPages; page++ {
		payload, err := c.fetchOwnerVideoPage(ctx, page)
		if err != nil {
			return snapshot, fmt.Errorf("owner archive page %d: %w", page, err)
		}
		pageCount := *payload.Data.Page.Count
		if pageCount < 0 || pageCount > ownerVideoMaxPages*ownerVideoPageSize || (count >= 0 && pageCount != count) {
			return snapshot, fmt.Errorf("owner archive invalid or changing total count")
		}
		count = pageCount
		rows := *payload.Data.List.VList
		expected := count - len(snapshot.Items)
		if expected > ownerVideoPageSize {
			expected = ownerVideoPageSize
		}
		if len(rows) != expected {
			return snapshot, fmt.Errorf("owner archive incomplete page %d: got %d expected %d", page, len(rows), expected)
		}
		for _, row := range rows {
			cover := normalizeOwnerVideoCover(row.Pic)
			if row.MID == nil || strconv.FormatInt(*row.MID, 10) != c.cfg.BilibiliUID ||
				!ownerVideoBVIDRE.MatchString(row.BVID) || seen[row.BVID] || strings.TrimSpace(row.Title) == "" ||
				row.Description == nil || strings.TrimSpace(row.Author) == "" || row.Created <= 0 || row.Created > 253402300799 ||
				!ownerVideoDurationRE.MatchString(row.Length) || cover == "" {
				return snapshot, fmt.Errorf("owner archive contains invalid, duplicate or foreign video")
			}
			if snapshot.Owner.Name != "" && snapshot.Owner.Name != row.Author {
				return snapshot, fmt.Errorf("owner archive author changed during pagination")
			}
			snapshot.Owner.Name = row.Author
			seen[row.BVID] = true
			snapshot.Items = append(snapshot.Items, ownerVideo{
				BVID: row.BVID, Title: row.Title, Description: *row.Description,
				Cover: cover, CoverURL: cover, PublishedAt: time.Unix(row.Created, 0).UTC().Format(time.RFC3339),
				Duration: row.Length,
			})
		}
		if len(snapshot.Items) == count {
			snapshot.Ready = true
			return snapshot, nil
		}
	}
	return snapshot, fmt.Errorf("owner archive exceeded page limit")
}
