package featuretypes

import "github.com/SigNoz/signoz/pkg/valuer"

// A concrete type for a feature flag stage
type Stage struct{ valuer.String }

var (
	// Used when the feature is experimental
	StageExperimental = Stage{valuer.NewString("experimental")}

	// Used when the feature works and in preview stage but is not ready for production
	StagePreview = Stage{valuer.NewString("preview")}

	// Used when the feature is stable and ready for production
	StageStable = Stage{valuer.NewString("stable")}

	// Used when the feature is deprecated and will be removed in the future
	StageDeprecated = Stage{valuer.NewString("deprecated")}
)
