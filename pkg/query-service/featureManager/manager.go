package featureManager

import (
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"go.uber.org/zap"
)

type FeatureManager struct {
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
func (fm *FeatureManager) GetFeatureFlags() ([]*featuretypes.GettableFeature, error) {
	features := constants.DEFAULT_FEATURE_SET
	return features, nil
}

func (fm *FeatureManager) InitFeatures(req []*featuretypes.GettableFeature) error {
	zap.L().Error("InitFeatures not implemented in OSS")
	return nil
}

func (fm *FeatureManager) UpdateFeatureFlag(req []*featuretypes.GettableFeature) error {
	zap.L().Error("UpdateFeatureFlag not implemented in OSS")
	return nil
}

func (fm *FeatureManager) GetFeatureFlag(key string) (*featuretypes.GettableFeature, error) {
	features, err := fm.GetFeatureFlags()
	if err != nil {
		return nil, err
	}
	for _, feature := range features {
		if feature.Name == key {
			return feature, nil
		}
	}
	return nil, model.ErrFeatureUnavailable{Key: key}
}
