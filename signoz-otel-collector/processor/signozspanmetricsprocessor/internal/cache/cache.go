// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cache

import (
	"github.com/hashicorp/golang-lru/simplelru"
)

// Cache consists of an LRU cache and the evicted items from the LRU cache.
// This data structure makes sure all the cached items can be retrieved either from the LRU cache or the evictedItems
// map. In spanmetricsprocessor's use case, we need to hold all the items during the current processing step for
// building the metrics. The evicted items can/should be safely removed once the metrics are built from the current
// batch of spans.
//
// Important: This implementation is non-thread safe.
type Cache[K comparable, V any] struct {
	lru          simplelru.LRUCache
	evictedItems map[K]V
}

// NewCache creates a Cache.
func NewCache[K comparable, V any](size int) (*Cache[K, V], error) {
	evictedItems := make(map[K]V)
	lruCache, err := simplelru.NewLRU(size, func(key any, value any) {
		evictedItems[key.(K)] = value.(V)
	})
	if err != nil {
		return nil, err
	}

	return &Cache[K, V]{
		lru:          lruCache,
		evictedItems: evictedItems,
	}, nil
}

// RemoveEvictedItems cleans all the evicted items.
func (c *Cache[K, V]) RemoveEvictedItems() {
	// we need to keep the original pointer to evictedItems map as it is used in the closure of lru.NewWithEvict
	for k := range c.evictedItems {
		delete(c.evictedItems, k)
	}
}

// Add a value to the cache, returns true if an eviction occurred and updates the "recently used"-ness of the key.
func (c *Cache[K, V]) Add(key K, value V) bool {
	return c.lru.Add(key, value)
}

// Get an item from the LRU cache or evicted items.
func (c *Cache[K, V]) Get(key K) (V, bool) {
	if val, ok := c.lru.Get(key); ok {
		return val.(V), ok
	}
	val, ok := c.evictedItems[key]

	// Revive from evicted items back into the main cache if a fetch was attempted.
	if ok {
		delete(c.evictedItems, key)
		c.Add(key, val)
	}

	return val, ok
}

func (c *Cache[K, V]) Contains(key K) bool {
	return c.lru.Contains(key)
}

// Len returns the number of items in the cache.
func (c *Cache[K, V]) Len() int {
	return c.lru.Len()
}

// Purge removes all the items from the LRU cache and evicted items.
func (c *Cache[K, V]) Purge() {
	c.lru.Purge()
	c.RemoveEvictedItems()
}
