package cachetypes

import (
	"encoding"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Cacheable interface {
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

func WrapCacheableErrors(rt reflect.Type, caller string) error {
	if rt == nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "%s: (nil)", caller)
	}

	if rt.Kind() != reflect.Pointer {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "%s: (non-pointer \"%s\")", caller, rt.String())
	}

	return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "%s: (nil \"%s\")", caller, rt.String())
}

func ValidatePointer(dest any, caller string) error {
	rv := reflect.ValueOf(dest)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return WrapCacheableErrors(reflect.TypeOf(dest), caller)
	}
	return nil
}
