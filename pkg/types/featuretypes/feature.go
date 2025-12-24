package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/open-feature/go-sdk/openfeature"
)

var (
	ErrCodeFeatureVariantNotFound        = errors.MustNewCode("feature_variant_not_found")
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

// Consumer facing feature struct
type GettableFeature struct {
	*Feature
	*FeatureVariant
}

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
