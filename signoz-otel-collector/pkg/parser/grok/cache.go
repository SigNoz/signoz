// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// copied from https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/parser/regex/cache.go

package grok

import (
	"math"
	"sync"
	"time"

	"go.uber.org/atomic"
)

// cache allows operators to cache a value and look it up later
type cache interface {
	get(key string) interface{}
	add(key string, data interface{}) bool
	copy() map[string]interface{}
	maxSize() uint16
}

// newMemoryCache takes a cache size and a limiter interval and
// returns a new memory backed cache
func newMemoryCache(maxSize uint16, interval uint64) *memoryCache {
	// start throttling when cache turnover is above 100%
	limit := uint64(maxSize) + 1

	return &memoryCache{
		cache:   make(map[string]interface{}),
		keys:    make(chan string, maxSize),
		limiter: newStartedAtomicLimiter(limit, interval),
	}
}

// memoryCache is an in memory cache of items with a pre defined
// max size. Memory's underlying storage is a map[string]item
// and does not perform any manipulation of the data. Memory
// is designed to be as fast as possible while being thread safe.
// When the cache is full, new items will evict the oldest
// item using a FIFO style queue.
type memoryCache struct {
	// Key / Value pairs of cached items
	cache map[string]interface{}

	// When the cache is full, the oldest entry's key is
	// read from the channel and used to index into the
	// cache during cleanup
	keys chan string

	// All read options will trigger a read lock while all
	// write options will trigger a lock
	mutex sync.RWMutex

	// Limiter rate limits the cache
	limiter limiter
}

var _ cache = (&memoryCache{})

// get returns a cached entry, nil if it does not exist
func (m *memoryCache) get(key string) interface{} {
	// Read and unlock as fast as possible
	m.mutex.RLock()
	data := m.cache[key]
	m.mutex.RUnlock()

	return data
}

// add inserts an item into the cache, if the cache is full, the
// oldest item is removed
func (m *memoryCache) add(key string, data interface{}) bool {
	if m.limiter.throttled() {
		return false
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	if len(m.keys) == cap(m.keys) {
		// Pop the oldest key from the channel
		// and remove it from the cache
		delete(m.cache, <-m.keys)

		// notify the rate limiter that an entry
		// was evicted
		m.limiter.increment()
	}

	// Write the cached entry and add the key
	// to the channel
	m.cache[key] = data
	m.keys <- key
	return true
}

// copy returns a deep copy of the cache
func (m *memoryCache) copy() map[string]interface{} {
	copy := make(map[string]interface{}, cap(m.keys))

	m.mutex.Lock()
	defer m.mutex.Unlock()

	for k, v := range m.cache {
		copy[k] = v
	}
	return copy
}

// maxSize returns the max size of the cache
func (m *memoryCache) maxSize() uint16 {
	return uint16(cap(m.keys))
}

// limiter provides rate limiting methods for
// the cache
type limiter interface {
	init()
	increment()
	currentCount() uint64
	limit() uint64
	resetInterval() time.Duration
	throttled() bool
}

// newStartedAtomicLimiter returns a started atomicLimiter
func newStartedAtomicLimiter(max uint64, interval uint64) *atomicLimiter {
	if interval == 0 {
		interval = 5
	}

	a := &atomicLimiter{
		count:    atomic.NewUint64(0),
		max:      max,
		interval: time.Second * time.Duration(interval),
	}

	a.init()
	return a
}

// atomicLimiter enables rate limiting using an atomic
// counter. When count is >= max, throttled will return
// true. The count is reset on an interval.
type atomicLimiter struct {
	count    *atomic.Uint64
	max      uint64
	interval time.Duration
	start    sync.Once
}

var _ limiter = &atomicLimiter{count: atomic.NewUint64(0)}

// init initializes the limiter
func (l *atomicLimiter) init() {
	// start the reset go routine once
	l.start.Do(func() {
		go func() {
			// During every interval period, reduce the counter
			// by 10%
			x := math.Round(-0.10 * float64(l.max))
			for {
				time.Sleep(l.interval)
				if l.currentCount() > 0 {
					l.count.Add(^uint64(x))
				}
			}
		}()
	})
}

// increment increments the atomic counter
func (l *atomicLimiter) increment() {
	if l.count.Load() == l.max {
		return
	}
	l.count.Inc()
}

// Returns true if the cache is currently throttled, meaning a high
// number of evictions have recently occurred due to the cache being
// full. When the cache is constantly locked, reads and writes are
// blocked, causing the regex parser to be slower than if it was
// not caching at all.
func (l *atomicLimiter) throttled() bool {
	return l.currentCount() >= l.max
}

func (l *atomicLimiter) currentCount() uint64 {
	return l.count.Load()
}

func (l *atomicLimiter) limit() uint64 {
	return l.max
}

func (l *atomicLimiter) resetInterval() time.Duration {
	return l.interval
}
