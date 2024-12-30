package generic_cache_entity

import "encoding"

type CacheableEntity interface {
	// to be able to support redis binary marshalling
	encoding.BinaryMarshaler
}
