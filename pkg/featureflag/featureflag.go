package featureflag

import "go.signoz.io/signoz/pkg/types"

// FeatureFlag is the interface that all feature flag providers must implement
type FeatureFlag interface {
	//pass context
	GetFeatures(orgID string) []types.Feature
}
