package inmemory

import (
	"time"

	go_cache "github.com/patrickmn/go-cache"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

// cache implements the Cache interface
type cache struct {
	*go_cache.Cache
}

// New creates a new in-memory cache
func New() *cache {
	return &cache{}
}

// Connect does nothing
func (c *cache) Connect() error {
	return nil
}

// Store stores the data in the cache
func (c *cache) Store(cacheKey string, data []byte, ttl time.Duration) error {
	c.Set(cacheKey, data, ttl)
	return nil
}

// Retrieve retrieves the data from the cache
func (c *cache) Retrieve(cacheKey string, allowExpired bool) ([]byte, status.RetrieveStatus, error) {
	data, found := c.Get(cacheKey)
	if !found {
		return nil, status.RetrieveStatusKeyMiss, nil
	}

	return data.([]byte), status.RetrieveStatusHit, nil
}

// SetTTL sets the TTL for the cache entry
func (c *cache) SetTTL(cacheKey string, ttl time.Duration) {
	// noop
}

// Remove removes the cache entry
func (c *cache) Remove(cacheKey string) {
	c.Delete(cacheKey)
}

// BulkRemove removes the cache entries
func (c *cache) BulkRemove(cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		c.Delete(cacheKey)
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
