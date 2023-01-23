package redis

import (
	"context"
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

func New(opts *Options) *cache {
	return &cache{
		opts: opts,
	}
}

func (c *cache) Connect() error {
	c.client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", c.opts.Host, c.opts.Port),
		Password: c.opts.Password,
		DB:       c.opts.DB,
	})
	return nil
}

func (c *cache) Store(cacheKey string, data []byte, ttl time.Duration) error {
	return c.client.Set(context.Background(), cacheKey, data, ttl).Err()
}

func (c *cache) Retrieve(cacheKey string, allowExpired bool) ([]byte, status.RetrieveStatus, error) {
	data, err := c.client.Get(context.Background(), cacheKey).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, status.RetrieveStatusKeyMiss, nil
		}
		return nil, status.RetrieveStatusError, err
	}
	return data, status.RetrieveStatusHit, nil
}

func (c *cache) SetTTL(cacheKey string, ttl time.Duration) {
	// noop
}

func (c *cache) Remove(cacheKey string) {
	err := c.client.Del(context.Background(), cacheKey).Err()
	if err != nil {
		zap.S().Error("error deleting cache key", zap.String("cacheKey", cacheKey), zap.Error(err))
	}
}

func (c *cache) BulkRemove(cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		c.Remove(cacheKey)
	}
}

func (c *cache) Close() error {
	return c.client.Close()
}

func (c *cache) Ping() error {
	return c.client.Ping(context.Background()).Err()
}

func (c *cache) GetClient() *redis.Client {
	return c.client
}

func (c *cache) GetOptions() *Options {
	return c.opts
}

func (c *cache) GetTTL(cacheKey string) time.Duration {
	ttl, err := c.client.TTL(context.Background(), cacheKey).Result()
	if err != nil {
		zap.S().Error("error getting TTL for cache key", zap.String("cacheKey", cacheKey), zap.Error(err))
	}
	return ttl
}

func (c *cache) GetKeys(pattern string) ([]string, error) {
	return c.client.Keys(context.Background(), pattern).Result()
}

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
