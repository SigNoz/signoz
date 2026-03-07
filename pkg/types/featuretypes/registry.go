package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/open-feature/go-sdk/openfeature"
)

// Consumer facing interface for the feature registry
type Registry interface {
	// Returns the feature and the resolution detail for the given name
	Get(name Name) (*Feature, openfeature.ProviderResolutionDetail, error)

	// Returns the feature and the resolution detail for the given string name
	GetByString(name string) (*Feature, openfeature.ProviderResolutionDetail, error)

	// Returns all the features in the registry
	List() []*Feature
}

// Concrete implementation of the Registry interface
type registry struct {
	features map[Name]*Feature
}

// Validates and builds a new registry from a list of features
func NewRegistry(features ...*Feature) (Registry, error) {
	registry := &registry{features: make(map[Name]*Feature)}

	for _, feature := range features {
		// Check if the name is unique
		if _, ok := registry.features[feature.Name]; ok {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "feature name %s already exists", feature.Name.String())
		}

		// Default variant should always be present
		if _, ok := feature.Variants[feature.DefaultVariant]; !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "default variant %s not found for feature %s in variants %v", feature.DefaultVariant.String(), feature.Name.String(), feature.Variants)
		}

		switch feature.Kind {

		case KindBoolean:
			err := validateFeature[bool](feature)
			if err != nil {
				return nil, err
			}

		case KindString:
			err := validateFeature[string](feature)
			if err != nil {
				return nil, err
			}

		case KindFloat:
			err := validateFeature[float64](feature)
			if err != nil {
				return nil, err
			}

		case KindInt:
			err := validateFeature[int64](feature)
			if err != nil {
				return nil, err
			}

		case KindObject:
			err := validateFeature[any](feature)
			if err != nil {
				return nil, err
			}

		}

		registry.features[feature.Name] = feature
	}

	return registry, nil
}

func validateFeature[T any](feature *Feature) error {
	_, _, err := VariantValue[T](feature, feature.DefaultVariant)
	if err != nil {
		return err
	}

	for variant := range feature.Variants {
		_, _, err := VariantValue[T](feature, variant)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *registry) Get(name Name) (f *Feature, detail openfeature.ProviderResolutionDetail, err error) {
	feature, ok := r.features[name]
	if !ok {
		err = errors.Newf(errors.TypeNotFound, ErrCodeFeatureNotFound, "feature %s not found", name.String())
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
		}
		return
	}

	return feature, openfeature.ProviderResolutionDetail{}, nil
}

func (r *registry) GetByString(name string) (f *Feature, detail openfeature.ProviderResolutionDetail, err error) {
	featureName, err := NewName(name)
	if err != nil {
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewFlagNotFoundResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
		}
		return
	}

	return r.Get(featureName)
}

func (r *registry) List() []*Feature {
	features := make([]*Feature, 0, len(r.features))
	for _, f := range r.features {
		features = append(features, f)
	}
	return features
}
