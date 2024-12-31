package entity

import (
	"encoding"
	"fmt"
	"reflect"
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
