package interfaces

import (
	"go.signoz.io/query-service/model"
)

type FeatureLookup interface {
	CheckFeature(f string) error
	GetFeatureFlags() model.FeatureSet
}
