package licenseprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/open-feature/go-sdk/openfeature"
)

type provider struct {
	config    flagger.Config
	settings  factory.ScopedProviderSettings
	registry  featuretypes.Registry
	licensing licensing.Licensing
}

func NewFactory(registry featuretypes.Registry, licensing licensing.Licensing) factory.ProviderFactory[flagger.Provider, flagger.Config] {
	return factory.NewProviderFactory(factory.MustNewName("license"), func(ctx context.Context, providerSettings factory.ProviderSettings, config flagger.Config) (flagger.Provider, error) {
		return New(ctx, providerSettings, config, registry, licensing)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config flagger.Config, registry featuretypes.Registry, licensing licensing.Licensing) (flagger.Provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/flagger/licenseprovider")

	return &provider{
		config:    config,
		settings:  settings,
		registry:  registry,
		licensing: licensing,
	}, nil
}

func (provider *provider) Metadata() openfeature.Metadata {
	return openfeature.Metadata{
		Name: "license",
	}
}

func (provider *provider) BooleanEvaluation(ctx context.Context, flag string, defaultValue bool, evalCtx openfeature.FlattenedContext) openfeature.BoolResolutionDetail {
	feature, detail, err := provider.registry.GetByNameString(flag)
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx["orgID"].(valuer.UUID))
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
				Reason:          openfeature.ErrorReason,
				Variant:         feature.DefaultVariant,
				ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			},
		}
	}

	if featureValue, ok := license.FeatureVariants()[feature.Name]; ok {
		value, detail, err := featuretypes.GetFeatureVariantValue[bool](feature, featureValue.Variant)
		if err != nil {
			return openfeature.BoolResolutionDetail{
				Value:                    defaultValue,
				ProviderResolutionDetail: detail,
			}
		}

		return openfeature.BoolResolutionDetail{
			Value:                    value,
			ProviderResolutionDetail: detail,
		}
	}

	return openfeature.BoolResolutionDetail{
		Value: defaultValue,
		ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
			Reason:  openfeature.StaticReason,
			Variant: feature.DefaultVariant,
		},
	}
}

func (provider *provider) StringEvaluation(ctx context.Context, flag string, defaultValue string, evalCtx openfeature.FlattenedContext) openfeature.StringResolutionDetail {
	feature, detail, err := provider.registry.GetByNameString(flag)
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx["orgID"].(valuer.UUID))
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
				Reason:          openfeature.ErrorReason,
				Variant:         feature.DefaultVariant,
				ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			},
		}
	}

	if featureValue, ok := license.FeatureVariants()[feature.Name]; ok {
		value, detail, err := featuretypes.GetFeatureVariantValue[string](feature, featureValue.Variant)
		if err != nil {
			return openfeature.StringResolutionDetail{
				Value:                    defaultValue,
				ProviderResolutionDetail: detail,
			}
		}

		return openfeature.StringResolutionDetail{
			Value:                    value,
			ProviderResolutionDetail: detail,
		}
	}

	return openfeature.StringResolutionDetail{
		Value: defaultValue,
		ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
			Reason:  openfeature.StaticReason,
			Variant: feature.DefaultVariant,
		},
	}
}

func (provider *provider) FloatEvaluation(ctx context.Context, flag string, defaultValue float64, evalCtx openfeature.FlattenedContext) openfeature.FloatResolutionDetail {
	feature, detail, err := provider.registry.GetByNameString(flag)
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx["orgID"].(valuer.UUID))
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
				Reason:          openfeature.ErrorReason,
				Variant:         feature.DefaultVariant,
				ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			},
		}
	}

	if featureValue, ok := license.FeatureVariants()[feature.Name]; ok {
		value, detail, err := featuretypes.GetFeatureVariantValue[float64](feature, featureValue.Variant)
		if err != nil {
			return openfeature.FloatResolutionDetail{
				Value:                    defaultValue,
				ProviderResolutionDetail: detail,
			}
		}

		return openfeature.FloatResolutionDetail{
			Value:                    value,
			ProviderResolutionDetail: detail,
		}
	}

	return openfeature.FloatResolutionDetail{
		Value: defaultValue,
		ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
			Reason:  openfeature.StaticReason,
			Variant: feature.DefaultVariant,
		},
	}
}

func (provider *provider) IntEvaluation(ctx context.Context, flag string, defaultValue int64, evalCtx openfeature.FlattenedContext) openfeature.IntResolutionDetail {
	feature, detail, err := provider.registry.GetByNameString(flag)
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx["orgID"].(valuer.UUID))
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
				Reason:          openfeature.ErrorReason,
				Variant:         feature.DefaultVariant,
				ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			},
		}
	}

	if featureValue, ok := license.FeatureVariants()[feature.Name]; ok {
		value, detail, err := featuretypes.GetFeatureVariantValue[int64](feature, featureValue.Variant)
		if err != nil {
			return openfeature.IntResolutionDetail{
				Value:                    defaultValue,
				ProviderResolutionDetail: detail,
			}
		}

		return openfeature.IntResolutionDetail{
			Value:                    value,
			ProviderResolutionDetail: detail,
		}
	}

	return openfeature.IntResolutionDetail{
		Value: defaultValue,
		ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
			Reason:  openfeature.StaticReason,
			Variant: feature.DefaultVariant,
		},
	}
}

func (provider *provider) ObjectEvaluation(ctx context.Context, flag string, defaultValue interface{}, evalCtx openfeature.FlattenedContext) openfeature.InterfaceResolutionDetail {
	feature, detail, err := provider.registry.GetByNameString(flag)
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx["orgID"].(valuer.UUID))
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
				Reason:          openfeature.ErrorReason,
				Variant:         feature.DefaultVariant,
				ResolutionError: openfeature.NewGeneralResolutionError(err.Error()),
			},
		}
	}

	if featureValue, ok := license.FeatureVariants()[feature.Name]; ok {
		value, detail, err := featuretypes.GetFeatureVariantValue[interface{}](feature, featureValue.Variant)
		if err != nil {
			return openfeature.InterfaceResolutionDetail{
				Value:                    defaultValue,
				ProviderResolutionDetail: detail,
			}
		}

		return openfeature.InterfaceResolutionDetail{
			Value:                    value,
			ProviderResolutionDetail: detail,
		}
	}

	return openfeature.InterfaceResolutionDetail{
		Value: defaultValue,
		ProviderResolutionDetail: openfeature.ProviderResolutionDetail{
			Reason:  openfeature.StaticReason,
			Variant: feature.DefaultVariant,
		},
	}
}

func (provider *provider) Hooks() []openfeature.Hook {
	return []openfeature.Hook{}
}

func (provider *provider) List(ctx context.Context, evalCtx featuretypes.EvaluationContext) ([]*featuretypes.GettableFeature, error) {
	license, err := provider.licensing.GetActiveLicense(ctx, evalCtx.OrgID())
	if err != nil {
		return nil, err
	}

	return featuretypes.NewGettableFeatures(provider.registry.List(), license.FeatureVariants()), nil
}
