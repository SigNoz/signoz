package featuretypes

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/open-feature/go-sdk/openfeature"
)

type Registry interface {
	// Merge merges the given registry with the current registry and returns a new registry.
	// The input registry takes precedence over the current registry.
	MergeOrOverride(Registry) Registry

	// Get returns the feature with the given name.
	Get(string) (*Feature, openfeature.ProviderResolutionDetail, error)

	// List returns all the features in the registry.
	List() []*Feature
}

type registry struct {
	features map[Name]*Feature
}

func NewRegistry(features ...*Feature) (Registry, error) {
	registry := &registry{features: make(map[Name]*Feature)}

	for _, feature := range features {
		// Name must be unique
		if _, ok := registry.features[feature.Name]; ok {
			return nil, fmt.Errorf("cannot build registry, duplicate name %q found", feature.Name.String())
		}

		// Default variant must be present in the variants
		if _, ok := feature.Variants[feature.DefaultVariant]; !ok {
			return nil, fmt.Errorf("cannot build registry, default variant %q not found in variants %v", feature.DefaultVariant, feature.Variants)
		}

		// Check that the type of the default variant and the variants match the kind of the feature
		switch feature.Kind {
		case KindBoolean:
			_, _, err := GetVariantValue[bool](feature, feature.DefaultVariant)
			if err != nil {
				return nil, err
			}

			for variant := range feature.Variants {
				_, _, err := GetVariantValue[bool](feature, variant)
				if err != nil {
					return nil, err
				}
			}
		case KindString:
			_, _, err := GetVariantValue[string](feature, feature.DefaultVariant)
			if err != nil {
				return nil, err
			}

			for variant := range feature.Variants {
				_, _, err := GetVariantValue[string](feature, variant)
				if err != nil {
					return nil, err
				}
			}
		case KindInt:
			_, _, err := GetVariantValue[int](feature, feature.DefaultVariant)
			if err != nil {
				return nil, err
			}

			for variant := range feature.Variants {
				_, _, err := GetVariantValue[int](feature, variant)
				if err != nil {
					return nil, err
				}
			}
		case KindFloat:
			_, _, err := GetVariantValue[float64](feature, feature.DefaultVariant)
			if err != nil {
				return nil, err
			}

			for variant := range feature.Variants {
				_, _, err := GetVariantValue[float64](feature, variant)
				if err != nil {
					return nil, err
				}
			}
		case KindObject:
			_, _, err := GetVariantValue[map[string]any](feature, feature.DefaultVariant)
			if err != nil {
				return nil, err
			}

			for variant := range feature.Variants {
				_, _, err := GetVariantValue[map[string]any](feature, variant)
				if err != nil {
					return nil, err
				}
			}
		}

		registry.features[feature.Name] = feature
	}

	return registry, nil
}

func (registry *registry) MergeOrOverride(other Registry) Registry {
	for _, feature := range other.List() {
		if _, ok := registry.features[feature.Name]; ok {
			registry.features[feature.Name] = feature
		}

		registry.features[feature.Name] = feature
	}

	return registry
}

func (registry *registry) Get(flag string) (*Feature, openfeature.ProviderResolutionDetail, error) {
	name, err := NewName(flag)
	if err != nil {
		return nil, openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewFlagNotFoundResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
		}, err
	}

	feature, ok := registry.features[name]
	if !ok {
		return nil, openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewFlagNotFoundResolutionError(errors.Newf(errors.TypeNotFound, ErrCodeFeatureNotFound, "feature %s not found in registry", name.String()).Error()),
			Reason:          openfeature.ErrorReason,
		}, err
	}

	return feature, openfeature.ProviderResolutionDetail{}, nil
}

func (registry *registry) List() []*Feature {
	features := make([]*Feature, 0, len(registry.features))
	for _, feature := range registry.features {
		features = append(features, feature)
	}

	return features
}
