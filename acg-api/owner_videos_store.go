package main

import (
	"database/sql"
	"fmt"
	"time"
)

func readOwnerVideos(db *sql.DB, uid string) (ownerVideosSnapshot, error) {
	snapshot := ownerVideosSnapshot{
		Owner: biliVideoOwner{UID: uid, ProfileURL: "https://space.bilibili.com/" + uid + "/"},
		Items: []ownerVideo{},
	}
	// One statement sees the state and its items from the same SQLite snapshot.
	rows, err := db.Query(`SELECT s.name, s.synced_at, v.bvid, v.title, v.description,
		v.cover_url, v.cover_path, v.published_at, v.duration
		FROM bili_owner_video_state s
		LEFT JOIN bili_owner_videos v ON v.owner_uid = s.uid
		WHERE s.uid = ? ORDER BY v.published_at DESC, v.bvid`, uid)
	if err != nil {
		return snapshot, err
	}
	defer rows.Close()
	for rows.Next() {
		var bvid, title, description, coverURL, coverPath, publishedAt, duration sql.NullString
		if err := rows.Scan(&snapshot.Owner.Name, &snapshot.SyncedAt, &bvid, &title, &description,
			&coverURL, &coverPath, &publishedAt, &duration); err != nil {
			return snapshot, err
		}
		snapshot.Ready = true
		if !bvid.Valid {
			continue
		}
		item := ownerVideo{
			BVID: bvid.String, Title: title.String, Description: description.String,
			Cover: coverURL.String, CoverURL: coverURL.String, CoverPath: coverPath.String,
			PublishedAt: publishedAt.String, Duration: duration.String,
		}
		if item.CoverPath != "" {
			item.Cover = "/api/v1/acg/image/" + item.CoverPath
		}
		snapshot.Items = append(snapshot.Items, item)
	}
	return snapshot, rows.Err()
}

func replaceOwnerVideos(db *sql.DB, snapshot ownerVideosSnapshot) error {
	if !snapshot.Ready || !validOwnerVideoUID(snapshot.Owner.UID) {
		return fmt.Errorf("invalid owner video snapshot")
	}
	if _, err := time.Parse(time.RFC3339Nano, snapshot.SyncedAt); err != nil {
		return fmt.Errorf("invalid owner video sync timestamp: %w", err)
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`INSERT INTO bili_owner_video_state(uid, name, synced_at) VALUES(?, ?, ?)
		ON CONFLICT(uid) DO UPDATE SET name=excluded.name, synced_at=excluded.synced_at`,
		snapshot.Owner.UID, snapshot.Owner.Name, snapshot.SyncedAt); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM bili_owner_videos WHERE owner_uid=?`, snapshot.Owner.UID); err != nil {
		return err
	}
	for _, item := range snapshot.Items {
		if _, err := tx.Exec(`INSERT INTO bili_owner_videos
			(owner_uid, bvid, title, description, cover_url, cover_path, published_at, duration)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, snapshot.Owner.UID, item.BVID, item.Title,
			item.Description, item.CoverURL, item.CoverPath, item.PublishedAt, item.Duration); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func migrateOwnerVideos(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS bili_owner_video_state (
			uid TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			synced_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS bili_owner_videos (
			owner_uid TEXT NOT NULL,
			bvid TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			cover_url TEXT NOT NULL,
			cover_path TEXT NOT NULL DEFAULT '',
			published_at TEXT NOT NULL,
			duration TEXT NOT NULL,
			PRIMARY KEY (owner_uid, bvid),
			FOREIGN KEY (owner_uid) REFERENCES bili_owner_video_state(uid)
		);
		CREATE INDEX IF NOT EXISTS idx_bili_owner_videos_published
		ON bili_owner_videos(owner_uid, published_at DESC, bvid);
	`)
	return err
}
