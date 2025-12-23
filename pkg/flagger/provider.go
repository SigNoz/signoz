package flagger

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

// Any feature flag provider has to implement this interface.
type Provider interface {
	openfeature.FeatureProvider

	// List returns all the feature flags
	List(ctx context.Context) ([]*featuretypes.Feature, error)
}
