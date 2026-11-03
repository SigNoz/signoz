package cache

import (
	"context"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Cache interface {
	// Set sets the cacheable entity in cache.
	Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data cachetypes.Cacheable, ttl time.Duration) error

	// Get gets the cacheble entity in the dest entity passed.
	Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable) error

	// GetMany gets the cacheable entities of cacheKeys into dests, one per key in
	// the same order. A key that is not found or could not be read sets its dest
	// to nil. The returned error joins the read failures; a miss alone is not one.
	GetMany(ctx context.Context, orgID valuer.UUID, cacheKeys []string, dests []cachetypes.Cacheable) error

	// Delete deletes the cacheable entity from cache
	Delete(ctx context.Context, orgID valuer.UUID, cacheKey string)

	// DeleteMany deletes multiple cacheble entities from cache
	DeleteMany(ctx context.Context, orgID valuer.UUID, cacheKeys []string)
}

type KeyGenerator interface {
	// GenerateKeys generates the cache keys for the given query range params
	// The keys are returned as a map where the key is the query name and the value is the cache key
	GenerateKeys(*v3.QueryRangeParamsV3) map[string]string
}
