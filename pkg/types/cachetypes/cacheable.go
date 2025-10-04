package cachetypes

import (
	"crypto/sha1"
	"encoding"
	"encoding/hex"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Cacheable interface {
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

type Cloneable interface {
	// Creates a deep copy of the Cacheable. This method is useful for memory caches to avoid the need for serialization/deserialization. It also prevents
	// race conditions in the memory cache.
	Clone() Cacheable
}

func NewSha1CacheKey(val string) string {
	hash := sha1.New()
	hash.Write([]byte(val))

	return hex.EncodeToString(hash.Sum(nil))
}

func CheckCacheablePointer(dest any) error {
	rv := reflect.ValueOf(dest)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		rt := reflect.TypeOf(dest)
		if rt == nil {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cacheable: (nil)")
		}

		if rt.Kind() != reflect.Pointer {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cacheable: (non-pointer \"%s\")", rt.String())
		}

		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cacheable: (nil \"%s\")", rt.String())
	}

	return nil
}
