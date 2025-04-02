package featuretypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Registry struct {
	features []Feature
}

func NewRegistry(features []Feature) *Registry {
	return &Registry{
		features: features,
	}
}

// Diff calculates the difference between the features for the given orgID. It will perform the following steps:
//
//   - Get the features for the given orgID
//   - If the feature is not set, get the feature from the registry
//   - If the feature is not set, return the default value
//   - If the feature is set, return the value
//   - If an extra feature is found, it will be ignored
func (registry *Registry) Diff(featuresPerOrg []*OrgFeature) ([]*OrgFeature, map[Action][]*OrgFeature, error) {
	resolvedFeatures := make([]Feature, 0)

	diff := make(map[Action][]*StorableFeaturePerOrg)
	diff[ActionInsert] = make([]*StorableFeaturePerOrg, 0)
	diff[ActionUpdate] = make([]*StorableFeaturePerOrg, 0)
	diff[ActionDelete] = make([]*StorableFeaturePerOrg, 0)

	for _, featurePerOrg := range featuresPerOrg {
		if slices.ContainsFunc(registry.features, func(f Feature) bool { return f.ID == featurePerOrg.FeatureID }) {
			//diff[ActionUpdate] = append(diff[ActionUpdate])
			continue
		}

		diff[ActionDelete] = append(diff[ActionDelete], featurePerOrg)
	}

	return resolvedFeatures, diff, nil
}

func (registry *Registry) Boolean(name Name) (feature Feature, err error) {
	for _, feature := range registry.features {
		if feature.Name == name {
			return feature, nil
		}
	}

	return Feature{}, errors.Newf(errors.TypeNotFound, ErrCodeFeatureNotFound, "feature %s not found", name.String())
}

func (registry *Registry) Get(id valuer.UUID) (Feature, error) {
	for _, feature := range registry.features {
		if feature.ID == id {
			return feature, nil
		}
	}

	return Feature{}, errors.Newf(errors.TypeNotFound, ErrCodeFeatureNotFound, "feature %s not found", name.String())
}

func (registry *Registry) List() []Feature {
	return registry.features
}
