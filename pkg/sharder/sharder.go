package sharder

import (
	"context"
)

type Sharder interface {
	// Returns the keys owned by the current instance.
	GetMyOwnedKeyRange(context.Context) (uint32, uint32, error)

	// Returns true if the key is owned by the current instance.
	IsMyOwnedKey(context.Context, uint32) error
}
