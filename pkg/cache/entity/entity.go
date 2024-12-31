package generic_cache_entity

import (
	"fmt"
	"reflect"
)

type CacheableEntity interface{}

func WrapCacheableEntityErrors(rt reflect.Type, caller string) error {
	if rt == nil {
		return fmt.Errorf("%s: (nil)", caller)
	}

	if rt.Kind() != reflect.Pointer {
		return fmt.Errorf("%s: (non-pointer \"%s\")", caller, rt.String())
	}

	return fmt.Errorf("%s: (nil \"%s\")", caller, rt.String())

}
