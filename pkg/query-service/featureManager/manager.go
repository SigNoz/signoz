package featureManager

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type FeatureManager struct {
	activeFeatures model.FeatureSet
}

func StartManager() *FeatureManager {
	fM := &FeatureManager{
		activeFeatures: constants.DEFAULT_FEATURE_SET,
	}
	return fM
}

// CheckFeature will be internally used by backend routines
// for feature gating
func (fm *FeatureManager) CheckFeature(featureKey string) error {
	if value, ok := fm.activeFeatures[featureKey]; ok {
		if value {
			return nil
		}
		return model.ErrFeatureUnavailable{Key: featureKey}
	}
	return model.ErrFeatureUnavailable{Key: featureKey}
}

// GetFeatureFlags returns current active features
func (fm *FeatureManager) GetFeatureFlags() model.FeatureSet {
	return fm.activeFeatures
}
