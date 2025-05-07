package interfaces

import (
	"github.com/SigNoz/signoz/pkg/query-service/model"
)

type FeatureLookup interface {
	CheckFeature(f string) error
	GetFeatureFlags() (model.FeatureSet, error)
	GetFeatureFlag(f string) (model.Feature, error)
	UpdateFeatureFlag(features model.Feature) error
	InitFeatures(features model.FeatureSet) error
}
