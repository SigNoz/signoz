package rediscache

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.uber.org/zap"
)

type provider struct {
	client *redis.Client
	opts   cache.Redis
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("redis"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	return &provider{opts: config.Redis}, nil
}

// WithClient creates a new cache with the given client
func WithClient(client *redis.Client) *provider {
	return &provider{client: client}
}

// Connect connects to the redis server
func (c *provider) Connect(_ context.Context) error {
	c.client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", c.opts.Host, c.opts.Port),
		Password: c.opts.Password,
		DB:       c.opts.DB,
	})
	return nil
}

// Store stores the data in the cache
func (c *provider) Store(ctx context.Context, cacheKey string, data cache.CacheableEntity, ttl time.Duration) error {
	return c.client.Set(ctx, cacheKey, data, ttl).Err()
}

// Retrieve retrieves the data from the cache
func (c *provider) Retrieve(ctx context.Context, cacheKey string, dest cache.CacheableEntity, allowExpired bool) (cache.RetrieveStatus, error) {
	err := c.client.Get(ctx, cacheKey).Scan(dest)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return cache.RetrieveStatusKeyMiss, nil
		}
		return cache.RetrieveStatusError, err
	}
	return cache.RetrieveStatusHit, nil
}

// SetTTL sets the TTL for the cache entry
func (c *provider) SetTTL(ctx context.Context, cacheKey string, ttl time.Duration) {
	err := c.client.Expire(ctx, cacheKey, ttl).Err()
	if err != nil {
		zap.L().Error("error setting TTL for cache key", zap.String("cacheKey", cacheKey), zap.Duration("ttl", ttl), zap.Error(err))
	}
}

// Remove removes the cache entry
func (c *provider) Remove(ctx context.Context, cacheKey string) {
	c.BulkRemove(ctx, []string{cacheKey})
}

// BulkRemove removes the cache entries
func (c *provider) BulkRemove(ctx context.Context, cacheKeys []string) {
	if err := c.client.Del(ctx, cacheKeys...).Err(); err != nil {
		zap.L().Error("error deleting cache keys", zap.Strings("cacheKeys", cacheKeys), zap.Error(err))
	}
}

// Close closes the connection to the redis server
func (c *provider) Close(_ context.Context) error {
	return c.client.Close()
}

// Ping pings the redis server
func (c *provider) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// GetClient returns the redis client
func (c *provider) GetClient() *redis.Client {
	return c.client
}

// GetTTL returns the TTL for the cache entry
func (c *provider) GetTTL(ctx context.Context, cacheKey string) time.Duration {
	ttl, err := c.client.TTL(ctx, cacheKey).Result()
	if err != nil {
		zap.L().Error("error getting TTL for cache key", zap.String("cacheKey", cacheKey), zap.Error(err))
	}
	return ttl
}

// GetKeys returns the keys matching the pattern
func (c *provider) GetKeys(ctx context.Context, pattern string) ([]string, error) {
	return c.client.Keys(ctx, pattern).Result()
}

// GetKeysWithTTL returns the keys matching the pattern with their TTL
func (c *provider) GetKeysWithTTL(ctx context.Context, pattern string) (map[string]time.Duration, error) {
	keys, err := c.GetKeys(ctx, pattern)
	if err != nil {
		return nil, err
	}
	result := make(map[string]time.Duration)
	for _, key := range keys {
		result[key] = c.GetTTL(ctx, key)
	}
	return result, nil
}
