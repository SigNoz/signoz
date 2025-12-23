package configflagger

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

type provider struct {
	config   flagger.Config
	settings factory.ScopedProviderSettings
	registry featuretypes.Registry
}

func NewFactory(registry featuretypes.Registry) factory.ProviderFactory[flagger.Provider, flagger.Config] {
	return factory.NewProviderFactory(factory.MustNewName("config"), func(ctx context.Context, ps factory.ProviderSettings, c flagger.Config) (flagger.Provider, error) {
		return New(ctx, ps, c, registry)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, c flagger.Config, registry featuretypes.Registry) (flagger.Provider, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagger/configprovider")
	return &provider{
		config:   c,
		settings: settings,
		registry: registry,
	}, nil
}

func (provider *provider) Metadata() openfeature.Metadata {
	return openfeature.Metadata{
		Name: "config",
	}
}

func (p *provider) BooleanEvaluation(ctx context.Context, flag string, defaultValue bool, evalCtx openfeature.FlattenedContext) openfeature.BoolResolutionDetail {

	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	value, detail, err := featuretypes.VariantValue[bool](feature, feature.DefaultVariant)
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

func (p *provider) FloatEvaluation(ctx context.Context, flag string, defaultValue float64, evalCtx openfeature.FlattenedContext) openfeature.FloatResolutionDetail {
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	value, detail, err := featuretypes.VariantValue[float64](feature, feature.DefaultVariant)
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

func (p *provider) StringEvaluation(ctx context.Context, flag string, defaultValue string, evalCtx openfeature.FlattenedContext) openfeature.StringResolutionDetail {
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	value, detail, err := featuretypes.VariantValue[string](feature, feature.DefaultVariant)
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

func (p *provider) IntEvaluation(ctx context.Context, flag string, defaultValue int64, evalCtx openfeature.FlattenedContext) openfeature.IntResolutionDetail {
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	value, detail, err := featuretypes.VariantValue[int64](feature, feature.DefaultVariant)
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

func (p *provider) ObjectEvaluation(ctx context.Context, flag string, defaultValue any, evalCtx openfeature.FlattenedContext) openfeature.InterfaceResolutionDetail {
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	value, detail, err := featuretypes.VariantValue[any](feature, feature.DefaultVariant)
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

func (provider *provider) Hooks() []openfeature.Hook {
	return []openfeature.Hook{}
}

func (p *provider) List(ctx context.Context) ([]*featuretypes.Feature, error) {
	return nil, nil
}
