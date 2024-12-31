package memory

import (
	"fmt"
	"reflect"
	"time"

	go_cache "github.com/patrickmn/go-cache"
	"go.signoz.io/signoz/pkg/cache/entity"
	"go.signoz.io/signoz/pkg/cache/status"
)

type cache struct {
	cc *go_cache.Cache
}

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
func (c *cache) Store(cacheKey string, data entity.CacheableEntity, ttl time.Duration) error {
	// check if the data being passed is a pointer and is not nil
	rv := reflect.ValueOf(data)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return entity.WrapCacheableEntityErrors(reflect.TypeOf(data), "inmemory")
	}

	c.cc.Set(cacheKey, data, ttl)
	return nil
}

// Retrieve retrieves the data from the cache
func (c *cache) Retrieve(cacheKey string, dest entity.CacheableEntity, allowExpired bool) (status.RetrieveStatus, error) {
	// check if the destination being passed is a pointer and is not nil
	dstv := reflect.ValueOf(dest)
	if dstv.Kind() != reflect.Pointer || dstv.IsNil() {
		return status.RetrieveStatusError, entity.WrapCacheableEntityErrors(reflect.TypeOf(dest), "inmemory")
	}

	// check if the destination value is settable
	if !dstv.Elem().CanSet() {
		return status.RetrieveStatusError, fmt.Errorf("destination value is not settable, %s", dstv.Elem())
	}

	data, found := c.cc.Get(cacheKey)
	if !found {
		return status.RetrieveStatusKeyMiss, nil
	}

	// check the type compatbility between the src and dest
	srcv := reflect.ValueOf(data)
	if !srcv.Type().AssignableTo(dstv.Type()) {
		return status.RetrieveStatusError, fmt.Errorf("src type is not assignable to dst type")
	}

	// set the value to from src to dest
	dstv.Elem().Set(srcv.Elem())
	return status.RetrieveStatusHit, nil
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
