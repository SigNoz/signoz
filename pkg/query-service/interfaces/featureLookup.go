package interfaces

import (
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
)

type FeatureLookup interface {
	CheckFeature(f string) error
	GetFeatureFlags() (featuretypes.FeatureSet, error)
	GetFeatureFlag(f string) (featuretypes.GettableFeature, error)
	UpdateFeatureFlag(features featuretypes.GettableFeature) error
	InitFeatures(features featuretypes.FeatureSet) error
}
