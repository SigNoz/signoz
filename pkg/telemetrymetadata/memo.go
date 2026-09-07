package telemetrymetadata

import (
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// memo caches the results of lookups for a TTL and collapses concurrent
// lookups of the same key into one call. A zero TTL disables caching.
type memo struct {
	ttl   time.Duration
	group singleflight.Group

	mu      sync.Mutex
	entries map[string]memoEntry
}

type memoEntry struct {
	value   any
	expires time.Time
}

func newMemo(ttl time.Duration) *memo {
	return &memo{ttl: ttl, entries: make(map[string]memoEntry)}
}

// do returns the cached value for key or computes it with fn. Errors are not
// cached.
func (m *memo) do(key string, fn func() (any, error)) (any, error) {
	if m.ttl <= 0 {
		return fn()
	}
	now := time.Now()
	m.mu.Lock()
	entry, ok := m.entries[key]
	m.mu.Unlock()
	if ok && entry.expires.After(now) {
		return entry.value, nil
	}
	value, err, _ := m.group.Do(key, func() (any, error) {
		value, err := fn()
		if err != nil {
			return nil, err
		}
		m.mu.Lock()
		m.entries[key] = memoEntry{value: value, expires: time.Now().Add(m.ttl)}
		m.mu.Unlock()
		return value, nil
	})
	return value, err
}
