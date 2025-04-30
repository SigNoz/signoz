package rediscache

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
)

type provider struct {
	client *redis.Client
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("redis"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	provider := new(provider)
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", config.Redis.Host, config.Redis.Port),
		Password: config.Redis.Password,
		DB:       config.Redis.DB,
	})
	provider.client = redisClient
	return provider, nil
}

// WithClient creates a new cache with the given client
func WithClient(client *redis.Client) *provider {
	return &provider{client: client}
}

// Store stores the data in the cache
func (c *provider) Set(ctx context.Context, orgID string, cacheKey string, data cache.CacheableEntity, ttl time.Duration) error {
	return c.client.Set(ctx, fmt.Sprintf("%s::%s", orgID, cacheKey), data, ttl).Err()
}

// Retrieve retrieves the data from the cache
func (c *provider) Get(ctx context.Context, orgID string, cacheKey string, dest cache.CacheableEntity, allowExpired bool) (cache.RetrieveStatus, error) {
	err := c.client.Get(ctx, fmt.Sprintf("%s::%s", orgID, cacheKey)).Scan(dest)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return cache.RetrieveStatusKeyMiss, nil
		}
		return cache.RetrieveStatusError, err
	}
	return cache.RetrieveStatusHit, nil
}

// Remove removes the cache entry
func (c *provider) Delete(ctx context.Context, orgID string, cacheKey string) {
	c.DeleteMany(ctx, orgID, []string{cacheKey})
}

// BulkRemove removes the cache entries
func (c *provider) DeleteMany(ctx context.Context, orgID string, cacheKeys []string) {
	updatedCacheKeys := []string{}
	for _, cacheKey := range cacheKeys {
		updatedCacheKeys = append(updatedCacheKeys, fmt.Sprintf("%s::%s", orgID, cacheKey))
	}
	if err := c.client.Del(ctx, cacheKeys...).Err(); err != nil {
		zap.L().Error("error deleting cache keys", zap.Strings("cacheKeys", updatedCacheKeys), zap.Error(err))
	}
}

// Close closes the connection to the redis server
func (c *provider) Close(_ context.Context) error {
	return c.client.Close()
}
