package main

import "net/http"

type biliVideoOwner struct {
	UID        string `json:"uid"`
	Name       string `json:"name"`
	ProfileURL string `json:"profileUrl"`
}

type ownerVideo struct {
	BVID        string `json:"bvid"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Cover       string `json:"cover"`
	PublishedAt string `json:"publishedAt"`
	Duration    string `json:"duration"`
	CoverURL    string `json:"-"`
	CoverPath   string `json:"-"`
}

type ownerVideosSnapshot struct {
	Owner    biliVideoOwner `json:"owner"`
	Items    []ownerVideo   `json:"items"`
	Ready    bool           `json:"ready"`
	SyncedAt string         `json:"syncedAt"`
}

func biliOwnerVideosHandler(cfg AppConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if r.URL.RawQuery != "" {
			http.Error(w, "query parameters are not supported", http.StatusBadRequest)
			return
		}
		snapshot, err := readOwnerVideos(db, cfg.BilibiliUID)
		if err != nil {
			http.Error(w, "owner video cache unavailable", http.StatusInternalServerError)
			return
		}
		writeJSON(w, snapshot)
	}
}
