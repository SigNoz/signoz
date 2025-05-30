package sharder

import (
	"context"
)

type Sharder interface {
	// Returns the keys owned by the current instance.
	GetMyOwnedKeyRange(context.Context) (uint64, uint64, error)

	// Returns true if the key is owned by the current instance.
	IsMyOwnedKey(context.Context, uint64) error
}
