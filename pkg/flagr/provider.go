package flagr

import (
	"context"

	"github.com/open-feature/go-sdk/openfeature"
)

// Any feature flag provider has to implement this interface.
type Provider interface {
	openfeature.FeatureProvider

	// List returns all the feature flags
	List(ctx context.Context) []any // TODO: Add type
}
