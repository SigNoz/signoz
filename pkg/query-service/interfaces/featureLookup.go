package interfaces

import (
	"go.signoz.io/signoz/pkg/query-service/model"
)

type FeatureLookup interface {
	CheckFeature(f string) error
	GetFeatureFlags() model.FeatureSet
}
