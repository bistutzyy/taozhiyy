package main

import (
	"fmt"
	"os"
	"strings"
)

const (
	ownerVideoCacheMaxBytes = 256 * 1024 * 1024
	ownerVideoCacheMaxFiles = 1024
)

type ownerVideoCoverBudget struct {
	MaxBytes int64
	MaxFiles int
}

type ownerVideoCoverQuota struct {
	budget ownerVideoCoverBudget
	sizes  map[string]int64
	bytes  int64
}

// Scan once under ownerVideoCacheMu; all cover writes and cleanup share that lock.
func newOwnerVideoCoverQuota(dir string, budget ownerVideoCoverBudget) (*ownerVideoCoverQuota, error) {
	if budget.MaxBytes < 0 || budget.MaxFiles < 0 {
		return nil, fmt.Errorf("invalid owner cover cache budget")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	quota := &ownerVideoCoverQuota{budget: budget, sizes: make(map[string]int64)}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "owner_") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return nil, err
		}
		if !info.Mode().IsRegular() || info.Size() < 0 {
			return nil, fmt.Errorf("invalid owner cover cache file")
		}
		quota.sizes[entry.Name()] = info.Size()
		quota.bytes += info.Size()
	}
	return quota, nil
}

func (q *ownerVideoCoverQuota) downloadLimit(name string) int64 {
	files := len(q.sizes)
	if _, exists := q.sizes[name]; !exists {
		files++
	}
	if files > q.budget.MaxFiles {
		return 0
	}
	remaining := q.budget.MaxBytes - q.bytes + q.sizes[name]
	if remaining > ownerVideoMaxCoverBytes {
		remaining = ownerVideoMaxCoverBytes
	}
	return remaining
}

func (q *ownerVideoCoverQuota) record(name string, size int64) {
	q.bytes += size - q.sizes[name]
	q.sizes[name] = size
}
