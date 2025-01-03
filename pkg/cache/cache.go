package cache

import (
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
	Connect() error
	Store(cacheKey string, data CacheableEntity, ttl time.Duration) error
	Retrieve(cacheKey string, dest CacheableEntity, allowExpired bool) (RetrieveStatus, error)
	SetTTL(cacheKey string, ttl time.Duration)
	Remove(cacheKey string)
	BulkRemove(cacheKeys []string)
	Close() error
}
