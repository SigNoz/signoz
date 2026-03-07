package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/open-feature/go-sdk/openfeature"
)

var (
	ErrCodeFeatureVariantNotFound        = errors.MustNewCode("feature_variant_not_found")
	ErrCodeFeatureValueNotFound          = errors.MustNewCode("feature_value_not_found")
	ErrCodeFeatureVariantKindMismatch    = errors.MustNewCode("feature_variant_kind_mismatch")
	ErrCodeFeatureDefaultVariantNotFound = errors.MustNewCode("feature_default_variant_not_found")
	ErrCodeFeatureNotFound               = errors.MustNewCode("feature_not_found")
)

// A concrete type for a feature flag
type Feature struct {
	// Name of the feature
	Name Name `json:"name"`
	// Kind of the feature
	Kind Kind `json:"kind"`
	// Stage of the feature
	Stage Stage `json:"stage"`
	// Description of the feature
	Description string `json:"description"`
	// DefaultVariant of the feature
	DefaultVariant Name `json:"defaultVariant"`
	// Variants of the feature
	Variants map[Name]FeatureVariant `json:"variants"`
}

// A concrete type for a feature flag variant
type FeatureVariant struct {
	// Name of the variant
	Variant Name `json:"variant"`
	// Value of the variant
	Value any `json:"value"`
}

type GettableFeature struct {
	Name           string         `json:"name"`
	Kind           string         `json:"kind"`
	Stage          string         `json:"stage"`
	Description    string         `json:"description"`
	DefaultVariant string         `json:"defaultVariant"`
	Variants       map[string]any `json:"variants"`
	ResolvedValue  any            `json:"resolvedValue"`
}

// This is the helper function to get the value of a variant of a feature
func VariantValue[T any](feature *Feature, variant Name) (t T, detail openfeature.ProviderResolutionDetail, err error) {
	value, ok := feature.Variants[variant]
	if !ok {
		err = errors.Newf(errors.TypeInvalidInput, ErrCodeFeatureVariantNotFound, "variant %s not found for feature %s in variants %v", variant.String(), feature.Name.String(), feature.Variants)
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
			Variant:         feature.DefaultVariant.String(),
		}
		return
	}

	t, ok = value.Value.(T)
	if !ok {
		err = errors.Newf(errors.TypeInvalidInput, ErrCodeFeatureVariantKindMismatch, "variant %s for feature %s has type %T, expected %T", variant.String(), feature.Name.String(), value.Value, t)
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewTypeMismatchResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
			Variant:         variant.String(),
		}
		return
	}

	detail = openfeature.ProviderResolutionDetail{
		Reason:  openfeature.StaticReason,
		Variant: variant.String(),
	}

	return
}

// This is the helper function to get the variant by value for the given feature
func VariantByValue[T comparable](feature *Feature, value T) (featureVariant *FeatureVariant, err error) {

	// technically this method should not be called for object kind
	// but just for fallback
	if feature.Kind == KindObject {
		// return the default variant - just for fallback
		// ? think more on this
		return &FeatureVariant{Variant: feature.DefaultVariant, Value: value}, nil
	}

	for _, variant := range feature.Variants {
		if variant.Value == value {
			return &variant, nil
		}
	}

	return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeFeatureVariantNotFound, "no variant found for value %v for feature %s in variants %v", value, feature.Name.String(), feature.Variants)
}

func NewBooleanVariants() map[Name]FeatureVariant {
	return map[Name]FeatureVariant{
		MustNewName("disabled"): {
			Variant: MustNewName("disabled"),
			Value:   false,
		},
		MustNewName("enabled"): {
			Variant: MustNewName("enabled"),
			Value:   true,
		},
	}
}
