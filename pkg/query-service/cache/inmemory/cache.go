package inmemory

import (
	"time"

	go_cache "github.com/patrickmn/go-cache"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

// cache implements the Cache interface
type cache struct {
	cc *go_cache.Cache
}

// New creates a new in-memory cache
func New(opts *Options) *cache {
	if opts == nil {
		opts = defaultOptions()
	}
	return &cache{cc: go_cache.New(opts.TTL, opts.CleanupInterval)}
}

// Connect does nothing
func (c *cache) Connect() error {
	return nil
}

// Store stores the data in the cache
func (c *cache) Store(cacheKey string, data []byte, ttl time.Duration) error {
	c.cc.Set(cacheKey, data, ttl)
	return nil
}

// Retrieve retrieves the data from the cache
func (c *cache) Retrieve(cacheKey string, allowExpired bool) ([]byte, status.RetrieveStatus, error) {
	data, found := c.cc.Get(cacheKey)
	if !found {
		return nil, status.RetrieveStatusKeyMiss, nil
	}

	return data.([]byte), status.RetrieveStatusHit, nil
}

// SetTTL sets the TTL for the cache entry
func (c *cache) SetTTL(cacheKey string, ttl time.Duration) {
	item, found := c.cc.Get(cacheKey)
	if !found {
		return
	}
	c.cc.Replace(cacheKey, item, ttl)
}

// Remove removes the cache entry
func (c *cache) Remove(cacheKey string) {
	c.cc.Delete(cacheKey)
}

// BulkRemove removes the cache entries
func (c *cache) BulkRemove(cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		c.cc.Delete(cacheKey)
	}
}

// Close does nothing
func (c *cache) Close() error {
	return nil
}

// Configuration returns the cache configuration
func (c *cache) Configuration() *Options {
	return nil
}
