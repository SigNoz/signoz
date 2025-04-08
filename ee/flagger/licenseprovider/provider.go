package licenseprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

type provider struct {
	config        flagger.Config
	settings      factory.ScopedProviderSettings
	featureValues map[featuretypes.Name]featuretypes.FeatureValue
	registry      featuretypes.Registry
}

func NewFactory(registry featuretypes.Registry) factory.ProviderFactory[flagger.Provider, flagger.Config] {
	return factory.NewProviderFactory(factory.MustNewName("license"), func(ctx context.Context, providerSettings factory.ProviderSettings, config flagger.Config) (flagger.Provider, error) {
		return New(ctx, providerSettings, config, registry)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config flagger.Config, registry featuretypes.Registry) (flagger.Provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/flagger/licenseprovider")

	featureValues := make(map[featuretypes.Name]featuretypes.FeatureValue)
	for _, flag := range config.Boolean.Enabled {
		name, err := featuretypes.NewName(flag)
		if err != nil {
			settings.Logger().Error("invalid flag name encountered", "flag", flag, "error", err)
			continue
		}

		featureValues[name] = featuretypes.FeatureValue{
			Name:    name,
			Variant: featuretypes.KindBooleanVariantEnabled,
		}
	}

	for _, flag := range config.Boolean.Disabled {
		name, err := featuretypes.NewName(flag)
		if err != nil {
			settings.Logger().Error("invalid flag name encountered", "flag", flag, "error", err)
			continue
		}

		if _, ok := featureValues[name]; ok {
			settings.Logger().Error("flag already exists and has been enabled", "flag", flag)
			continue
		}

		featureValues[name] = featuretypes.FeatureValue{
			Name:    name,
			Variant: featuretypes.KindBooleanVariantDisabled,
		}
	}

	return &provider{
		config:        config,
		settings:      settings,
		featureValues: featureValues,
		registry:      registry,
	}, nil
}

func (provider *provider) Metadata() openfeature.Metadata {
	return openfeature.Metadata{
		Name: "license",
	}
}

func (provider *provider) BooleanEvaluation(ctx context.Context, flag string, defaultValue bool, evalCtx openfeature.FlattenedContext) openfeature.BoolResolutionDetail {
	feature, detail, err := provider.registry.Get(flag)
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	if featureValue, ok := provider.featureValues[feature.Name]; ok {
		value, detail, err := featuretypes.GetVariantValue[bool](feature, featureValue.Variant)
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
	feature, detail, err := provider.registry.Get(flag)
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	if featureValue, ok := provider.featureValues[feature.Name]; ok {
		value, detail, err := featuretypes.GetVariantValue[string](feature, featureValue.Variant)
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
	feature, detail, err := provider.registry.Get(flag)
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	if featureValue, ok := provider.featureValues[feature.Name]; ok {
		value, detail, err := featuretypes.GetVariantValue[float64](feature, featureValue.Variant)
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
	feature, detail, err := provider.registry.Get(flag)
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	if featureValue, ok := provider.featureValues[feature.Name]; ok {
		value, detail, err := featuretypes.GetVariantValue[int64](feature, featureValue.Variant)
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
	feature, detail, err := provider.registry.Get(flag)
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	if featureValue, ok := provider.featureValues[feature.Name]; ok {
		value, detail, err := featuretypes.GetVariantValue[interface{}](feature, featureValue.Variant)
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
