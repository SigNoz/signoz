package featureManager

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

type FeatureManager struct {
}

func StartManager() *FeatureManager {
	fM := &FeatureManager{}
	return fM
}

// CheckFeature will be internally used by backend routines
// for feature gating
func (fm *FeatureManager) CheckFeature(featureKey string) error {

	feature, err := fm.GetFeatureFlag(featureKey)
	if err != nil {
		return err
	}

	if feature.Active {
		return nil
	}

	return model.ErrFeatureUnavailable{Key: featureKey}
}

// GetFeatureFlags returns current features
func (fm *FeatureManager) GetFeatureFlags() (model.FeatureSet, error) {
	features := append(constants.DEFAULT_FEATURE_SET, model.Feature{
		Name:       model.OSS,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	})
	return features, nil
}

func (fm *FeatureManager) InitFeatures(req model.FeatureSet) error {
	zap.L().Error("InitFeatures not implemented in OSS")
	return nil
}

func (fm *FeatureManager) UpdateFeatureFlag(req model.Feature) error {
	zap.L().Error("UpdateFeatureFlag not implemented in OSS")
	return nil
}

func (fm *FeatureManager) GetFeatureFlag(key string) (model.Feature, error) {
	features, err := fm.GetFeatureFlags()
	if err != nil {
		return model.Feature{}, err
	}
	for _, feature := range features {
		if feature.Name == key {
			return feature, nil
		}
	}
	return model.Feature{}, model.ErrFeatureUnavailable{Key: key}
}
