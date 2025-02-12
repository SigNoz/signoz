package memorycache

import (
	"context"
	"fmt"
	"reflect"
	"time"

	go_cache "github.com/patrickmn/go-cache"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
)

type provider struct {
	cc *go_cache.Cache
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("memory"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	return &provider{cc: go_cache.New(config.Memory.TTL, config.Memory.CleanupInterval)}, nil
}

// Connect does nothing
func (c *provider) Connect(_ context.Context) error {
	return nil
}

// Store stores the data in the cache
func (c *provider) Store(_ context.Context, cacheKey string, data cache.CacheableEntity, ttl time.Duration) error {
	// check if the data being passed is a pointer and is not nil
	rv := reflect.ValueOf(data)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return cache.WrapCacheableEntityErrors(reflect.TypeOf(data), "inmemory")
	}

	c.cc.Set(cacheKey, data, ttl)
	return nil
}

// Retrieve retrieves the data from the cache
func (c *provider) Retrieve(_ context.Context, cacheKey string, dest cache.CacheableEntity, allowExpired bool) (cache.RetrieveStatus, error) {
	// check if the destination being passed is a pointer and is not nil
	dstv := reflect.ValueOf(dest)
	if dstv.Kind() != reflect.Pointer || dstv.IsNil() {
		return cache.RetrieveStatusError, cache.WrapCacheableEntityErrors(reflect.TypeOf(dest), "inmemory")
	}

	// check if the destination value is settable
	if !dstv.Elem().CanSet() {
		return cache.RetrieveStatusError, fmt.Errorf("destination value is not settable, %s", dstv.Elem())
	}

	data, found := c.cc.Get(cacheKey)
	if !found {
		return cache.RetrieveStatusKeyMiss, nil
	}

	// check the type compatbility between the src and dest
	srcv := reflect.ValueOf(data)
	if !srcv.Type().AssignableTo(dstv.Type()) {
		return cache.RetrieveStatusError, fmt.Errorf("src type is not assignable to dst type")
	}

	// set the value to from src to dest
	dstv.Elem().Set(srcv.Elem())
	return cache.RetrieveStatusHit, nil
}

// SetTTL sets the TTL for the cache entry
func (c *provider) SetTTL(_ context.Context, cacheKey string, ttl time.Duration) {
	item, found := c.cc.Get(cacheKey)
	if !found {
		return
	}
	c.cc.Replace(cacheKey, item, ttl)
}

// Remove removes the cache entry
func (c *provider) Remove(_ context.Context, cacheKey string) {
	c.cc.Delete(cacheKey)
}

// BulkRemove removes the cache entries
func (c *provider) BulkRemove(_ context.Context, cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		c.cc.Delete(cacheKey)
	}
}

// Close does nothing
func (c *provider) Close(_ context.Context) error {
	return nil
}

// Configuration returns the cache configuration
func (c *provider) Configuration() *cache.Memory {
	return nil
}
