package rediscache

import (
	"context"
	"strings"
	"time"

	"fmt"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/redis/go-redis/extra/redisotel/v9"
	"github.com/redis/go-redis/v9"
)

type provider struct {
	client   *redis.Client
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("redis"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/cache/rediscache")
	client := redis.NewClient(&redis.Options{
		Addr:     strings.Join([]string{config.Redis.Host, fmt.Sprint(config.Redis.Port)}, ":"),
		Password: config.Redis.Password,
		DB:       config.Redis.DB,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	if err := redisotel.InstrumentTracing(client, redisotel.WithTracerProvider(providerSettings.TracerProvider), redisotel.WithDBStatement(true)); err != nil {
		return nil, err
	}

	if err := redisotel.InstrumentMetrics(client, redisotel.WithMeterProvider(providerSettings.MeterProvider)); err != nil {
		return nil, err
	}

	return &provider{client: client, settings: settings}, nil
}

func (c *provider) Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data cachetypes.Cacheable, ttl time.Duration) error {
	return c.client.Set(ctx, strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), data, ttl).Err()
}

func (c *provider) Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable) error {
	err := c.client.Get(ctx, strings.Join([]string{orgID.StringValue(), cacheKey}, "::")).Scan(dest)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "key miss")
		}

		return err
	}

	return nil
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
		c.settings.Logger().ErrorContext(ctx, "error deleting cache keys", "cache_keys", cacheKeys, "error", err)
	}
}
