package cachetypes

import (
	"encoding"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Cacheable interface {
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
	Clone() Cacheable
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
