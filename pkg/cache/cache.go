package cache

import (
	"context"
	"encoding"
	"fmt"
	"reflect"
	"time"
)

// cacheable entity
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

// cache status
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

// cache interface
type Cache interface {
	Connect(ctx context.Context) error
	Store(ctx context.Context, cacheKey string, data CacheableEntity, ttl time.Duration) error
	Retrieve(ctx context.Context, cacheKey string, dest CacheableEntity, allowExpired bool) (RetrieveStatus, error)
	SetTTL(ctx context.Context, cacheKey string, ttl time.Duration)
	Remove(ctx context.Context, cacheKey string)
	BulkRemove(ctx context.Context, cacheKeys []string)
	Close(ctx context.Context) error
}
