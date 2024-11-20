package redis

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	"go.uber.org/zap"
)

type cache struct {
	client *redis.Client
	opts   *Options
}

// New creates a new cache
func New(opts *Options) *cache {
	if opts == nil {
		opts = defaultOptions()
	}
	return &cache{opts: opts}
}

// WithClient creates a new cache with the given client
func WithClient(client *redis.Client) *cache {
	return &cache{client: client}
}

// Connect connects to the redis server
func (c *cache) Connect() error {
	c.client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", c.opts.Host, c.opts.Port),
		Password: c.opts.Password,
		DB:       c.opts.DB,
	})
	return nil
}

// Store stores the data in the cache
func (c *cache) Store(cacheKey string, data []byte, ttl time.Duration) error {
	return c.client.Set(context.Background(), cacheKey, data, ttl).Err()
}

// Retrieve retrieves the data from the cache
func (c *cache) Retrieve(cacheKey string, allowExpired bool) ([]byte, status.RetrieveStatus, error) {
	data, err := c.client.Get(context.Background(), cacheKey).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, status.RetrieveStatusKeyMiss, nil
		}
		return nil, status.RetrieveStatusError, err
	}
	return data, status.RetrieveStatusHit, nil
}

// SetTTL sets the TTL for the cache entry
func (c *cache) SetTTL(cacheKey string, ttl time.Duration) {
	err := c.client.Expire(context.Background(), cacheKey, ttl).Err()
	if err != nil {
		zap.L().Error("error setting TTL for cache key", zap.String("cacheKey", cacheKey), zap.Duration("ttl", ttl), zap.Error(err))
	}
}

// Remove removes the cache entry
func (c *cache) Remove(cacheKey string) {
	c.BulkRemove([]string{cacheKey})
}

// BulkRemove removes the cache entries
func (c *cache) BulkRemove(cacheKeys []string) {
	if err := c.client.Del(context.Background(), cacheKeys...).Err(); err != nil {
		zap.L().Error("error deleting cache keys", zap.Strings("cacheKeys", cacheKeys), zap.Error(err))
	}
}

// Close closes the connection to the redis server
func (c *cache) Close() error {
	return c.client.Close()
}

// Ping pings the redis server
func (c *cache) Ping() error {
	return c.client.Ping(context.Background()).Err()
}

// GetClient returns the redis client
func (c *cache) GetClient() *redis.Client {
	return c.client
}

// GetOptions returns the options
func (c *cache) GetOptions() *Options {
	return c.opts
}

// GetTTL returns the TTL for the cache entry
func (c *cache) GetTTL(cacheKey string) time.Duration {
	ttl, err := c.client.TTL(context.Background(), cacheKey).Result()
	if err != nil {
		zap.L().Error("error getting TTL for cache key", zap.String("cacheKey", cacheKey), zap.Error(err))
	}
	return ttl
}

// GetKeys returns the keys matching the pattern
func (c *cache) GetKeys(pattern string) ([]string, error) {
	return c.client.Keys(context.Background(), pattern).Result()
}

// GetKeysWithTTL returns the keys matching the pattern with their TTL
func (c *cache) GetKeysWithTTL(pattern string) (map[string]time.Duration, error) {
	keys, err := c.GetKeys(pattern)
	if err != nil {
		return nil, err
	}
	result := make(map[string]time.Duration)
	for _, key := range keys {
		result[key] = c.GetTTL(key)
	}
	return result, nil
}
