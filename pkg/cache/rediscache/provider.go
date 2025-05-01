package rediscache

import (
	"context"
	"errors"
	"strings"
	"time"

	"fmt"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	provider.client = redis.NewClient(&redis.Options{
		Addr:     strings.Join([]string{config.Redis.Host, fmt.Sprint(config.Redis.Port)}, ":"),
		Password: config.Redis.Password,
		DB:       config.Redis.DB,
	})

	if err := provider.client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return provider, nil
}

func WithClient(client *redis.Client) *provider {
	return &provider{client: client}
}

func (c *provider) Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data cache.CacheableEntity, ttl time.Duration) error {
	return c.client.Set(ctx, strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), data, ttl).Err()
}

func (c *provider) Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest cache.CacheableEntity, allowExpired bool) (cache.RetrieveStatus, error) {
	err := c.client.Get(ctx, strings.Join([]string{orgID.StringValue(), cacheKey}, "::")).Scan(dest)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return cache.RetrieveStatusKeyMiss, nil
		}
		return cache.RetrieveStatusError, err
	}
	return cache.RetrieveStatusHit, nil
}

func (c *provider) Delete(ctx context.Context, orgID valuer.UUID, cacheKey string) {
	c.DeleteMany(ctx, orgID, []string{cacheKey})
}

func (c *provider) DeleteMany(ctx context.Context, orgID valuer.UUID, cacheKeys []string) {
	updatedCacheKeys := []string{}
	for _, cacheKey := range cacheKeys {
		updatedCacheKeys = append(updatedCacheKeys, strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	}

	if err := c.client.Del(ctx, updatedCacheKeys...).Err(); err != nil {
		zap.L().Error("error deleting cache keys", zap.Strings("cacheKeys", cacheKeys), zap.Error(err))
	}
}
