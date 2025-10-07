package telemetrylogs

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/licensetypes"
)

// isBodyJSONQueryEnabled checks if the BODY_JSON_QUERY feature flag is enabled
func isBodyJSONQueryEnabled(ctx context.Context, featureFlags []*licensetypes.Feature) bool {
	for _, feature := range featureFlags {
		if feature.Name == licensetypes.BodyJSONQuery {
			return feature.Active
		}
	}
	return false
}

// getFeatureFlagsFromContext extracts feature flags from context
// This is a placeholder - the actual implementation would depend on how
// feature flags are passed through the context in your system
func getFeatureFlagsFromContext(ctx context.Context) []*licensetypes.Feature {
	// TODO: Implement actual feature flag extraction from context
	// For now, return empty slice (feature disabled by default)
	return []*licensetypes.Feature{}
}

// IsBodyJSONQueryEnabled checks if body JSON query feature is enabled
func IsBodyJSONQueryEnabled(ctx context.Context) bool {
	featureFlags := getFeatureFlagsFromContext(ctx)
	return isBodyJSONQueryEnabled(ctx, featureFlags)
}
