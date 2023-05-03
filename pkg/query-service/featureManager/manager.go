package featureManager

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type FeatureManager struct {
}

func StartManager() *FeatureManager {
	fM := &FeatureManager{}
	features := append(constants.DEFAULT_FEATURE_SET, model.Feature{
		Name:       model.OSS,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	})
	err := dao.DB().InitFeatures(features)
	if err != nil {
		panic(err)
	}
	return fM
}

// CheckFeature will be internally used by backend routines
// for feature gating
func (fm *FeatureManager) CheckFeature(featureKey string) error {

	feature, err := dao.DB().GetFeature(featureKey)
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
	features, err := dao.DB().GetAllFeatures()
	if err != nil {
		return nil, err
	}
	return features, nil
}
