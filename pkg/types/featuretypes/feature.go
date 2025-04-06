package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/open-feature/go-sdk/openfeature"
)

var (
	ErrCodeFeatureNotFound        = errors.MustNewCode("feature_not_found")
	ErrCodeFeatureKindMismatch    = errors.MustNewCode("feature_kind_mismatch")
	ErrCodeFeatureVariantNotFound = errors.MustNewCode("feature_variant_not_found")
)

type Feature struct {
	// Name is the name of the feature flag.
	Name Name `json:"name"`

	// Kind is the kind of the feature flag.
	Kind Kind `json:"kind"`

	// Description is the description of the feature flag.
	Description string `json:"description"`

	// Stage is the stage of the feature flag.
	Stage Stage `json:"stage"`

	// DefaultVariant is the default variant of the feature flag.
	DefaultVariant string `json:"default_variant"`

	// Variants is the variants of the feature flag.
	Variants map[string]any `json:"variants"`
}

type FeatureValue struct {
	// Name is the name of the feature flag.
	Name Name `json:"name"`

	// Value is the value of the feature flag.
	Variant string `json:"variant"`
}

func NewKindBooleanFeatureVariants() map[string]any {
	return map[string]any{
		KindBooleanVariantEnabled:  true,
		KindBooleanVariantDisabled: false,
	}
}

func GetVariantValue[T any](feature *Feature, variant string) (t T, detail openfeature.ProviderResolutionDetail, err error) {
	value, ok := feature.Variants[variant]
	if !ok {
		err = errors.Newf(errors.TypeNotFound, ErrCodeFeatureVariantNotFound, "variant %s not found for feature %s", variant, feature.Name.String())
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
			Variant:         feature.DefaultVariant,
		}
		return
	}

	t, ok = value.(T)
	if !ok {
		err = errors.Newf(errors.TypeInvalidInput, ErrCodeFeatureKindMismatch, "variant %s has type %T, expected %T", variant, value, t)
		detail = openfeature.ProviderResolutionDetail{
			ResolutionError: openfeature.NewTypeMismatchResolutionError(err.Error()),
			Reason:          openfeature.ErrorReason,
			Variant:         feature.DefaultVariant,
		}
		return
	}

	detail = openfeature.ProviderResolutionDetail{
		Reason:  openfeature.StaticReason,
		Variant: variant,
	}

	return
}
