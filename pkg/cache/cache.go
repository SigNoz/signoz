package cache

import (
	"context"
	"encoding"
	"fmt"
	"reflect"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type CacheableEntity interface {
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

func WrapCacheableEntityErrors(rt reflect.Type, caller string) error {
	if rt == nil {
		return fmt.Errorf("%s: (nil)", caller)
	}

	if rt.Kind() != reflect.Pointer {
		return fmt.Errorf("%s: (non-pointer \"%s\")", caller, rt.String())
	}

	return fmt.Errorf("%s: (nil \"%s\")", caller, rt.String())

}

type RetrieveStatus int

const (
	RetrieveStatusHit = RetrieveStatus(iota)
	RetrieveStatusPartialHit
	RetrieveStatusRangeMiss
	RetrieveStatusKeyMiss
	RetrieveStatusRevalidated

	RetrieveStatusError
)

func (s RetrieveStatus) String() string {
	switch s {
	case RetrieveStatusHit:
		return "hit"
	case RetrieveStatusPartialHit:
		return "partial hit"
	case RetrieveStatusRangeMiss:
		return "range miss"
	case RetrieveStatusKeyMiss:
		return "key miss"
	case RetrieveStatusRevalidated:
		return "revalidated"
	case RetrieveStatusError:
		return "error"
	default:
		return "unknown"
	}
}

type Cache interface {
	// Set sets the cacheable entity in cache.
	Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data CacheableEntity, ttl time.Duration) error
	// Get gets the cacheble entity in the dest entity passed
	Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest CacheableEntity, allowExpired bool) (RetrieveStatus, error)
	// Delete deletes the cache kv pair from cache
	Delete(ctx context.Context, orgID valuer.UUID, cacheKey string)
	// DeleteMany deletes multiple cache kv pairs from  cache
	DeleteMany(ctx context.Context, orgID valuer.UUID, cacheKeys []string)
}

type KeyGenerator interface {
	// GenerateKeys generates the cache keys for the given query range params
	// The keys are returned as a map where the key is the query name and the value is the cache key
	GenerateKeys(*v3.QueryRangeParamsV3) map[string]string
}
