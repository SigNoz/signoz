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
	// This is the default registry that will be containing all the supported features along with there all possible variants
	registry featuretypes.Registry
	// These are the feature variants that are configured in the config file and will be used as overrides
	featureVariants map[featuretypes.Name]*featuretypes.FeatureVariant
}

func NewFactory(registry featuretypes.Registry) factory.ProviderFactory[flagger.FlaggerProvider, flagger.Config] {
	return factory.NewProviderFactory(factory.MustNewName("config"), func(ctx context.Context, ps factory.ProviderSettings, c flagger.Config) (flagger.FlaggerProvider, error) {
		return New(ctx, ps, c, registry)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, c flagger.Config, registry featuretypes.Registry) (flagger.FlaggerProvider, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagger/configflagger")

	featureVariants := make(map[featuretypes.Name]*featuretypes.FeatureVariant)

	for name, value := range c.Config.Boolean {
		feature, _, err := registry.GetByString(name)
		if err != nil {
			return nil, err
		}

		variant, err := featuretypes.VariantByValue(feature, value)
		if err != nil {
			return nil, err
		}

		featureVariants[feature.Name] = variant
	}

	for name, value := range c.Config.String {
		feature, _, err := registry.GetByString(name)
		if err != nil {
			return nil, err
		}

		variant, err := featuretypes.VariantByValue(feature, value)
		if err != nil {
			return nil, err
		}

		featureVariants[feature.Name] = variant
	}

	for name, value := range c.Config.Float {
		feature, _, err := registry.GetByString(name)
		if err != nil {
			return nil, err
		}

		variant, err := featuretypes.VariantByValue(feature, value)
		if err != nil {
			return nil, err
		}

		featureVariants[feature.Name] = variant
	}

	for name, value := range c.Config.Integer {
		feature, _, err := registry.GetByString(name)
		if err != nil {
			return nil, err
		}

		variant, err := featuretypes.VariantByValue(feature, value)
		if err != nil {
			return nil, err
		}

		featureVariants[feature.Name] = variant
	}

	for name, value := range c.Config.Object {
		feature, _, err := registry.GetByString(name)
		if err != nil {
			return nil, err
		}

		variant, err := featuretypes.VariantByValue(feature, value)
		if err != nil {
			return nil, err
		}

		featureVariants[feature.Name] = variant
	}

	return &provider{
		config:          c,
		settings:        settings,
		registry:        registry,
		featureVariants: featureVariants,
	}, nil
}

func (provider *provider) Metadata() openfeature.Metadata {
	return openfeature.Metadata{
		Name: "config",
	}
}

func (p *provider) BooleanEvaluation(ctx context.Context, flag string, defaultValue bool, evalCtx openfeature.FlattenedContext) openfeature.BoolResolutionDetail {
	// check if the feature is present in the default registry
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// get the default value from the feature from default registry
	value, detail, err := featuretypes.VariantValue[bool](feature, feature.DefaultVariant)
	if err != nil {
		return openfeature.BoolResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// check if the feature is present in the featureVariants map
	variant, ok := p.featureVariants[feature.Name]
	if ok {
		// return early as we have found the value in the featureVariants map
		return openfeature.BoolResolutionDetail{
			Value:                    variant.Value.(bool),
			ProviderResolutionDetail: detail,
		}
	}

	// return the value from the default registry we found earlier
	return openfeature.BoolResolutionDetail{
		Value:                    value,
		ProviderResolutionDetail: detail,
	}
}

func (p *provider) FloatEvaluation(ctx context.Context, flag string, defaultValue float64, evalCtx openfeature.FlattenedContext) openfeature.FloatResolutionDetail {
	// check if the feature is present in the default registry
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// get the default value from the feature from default registry
	value, detail, err := featuretypes.VariantValue[float64](feature, feature.DefaultVariant)
	if err != nil {
		return openfeature.FloatResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// check if the feature is present in the featureVariants map
	variant, ok := p.featureVariants[feature.Name]
	if ok {
		// return early as we have found the value in the featureVariants map
		return openfeature.FloatResolutionDetail{
			Value:                    variant.Value.(float64),
			ProviderResolutionDetail: detail,
		}
	}

	// return the value from the default registry we found earlier
	return openfeature.FloatResolutionDetail{
		Value:                    value,
		ProviderResolutionDetail: detail,
	}
}

func (p *provider) StringEvaluation(ctx context.Context, flag string, defaultValue string, evalCtx openfeature.FlattenedContext) openfeature.StringResolutionDetail {
	// check if the feature is present in the default registry
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// get the default value from the feature from default registry
	value, detail, err := featuretypes.VariantValue[string](feature, feature.DefaultVariant)
	if err != nil {
		return openfeature.StringResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// check if the feature is present in the featureVariants map
	variant, ok := p.featureVariants[feature.Name]
	if ok {
		// return early as we have found the value in the featureVariants map
		return openfeature.StringResolutionDetail{
			Value:                    variant.Value.(string),
			ProviderResolutionDetail: detail,
		}
	}

	// return the value from the default registry we found earlier
	return openfeature.StringResolutionDetail{
		Value:                    value,
		ProviderResolutionDetail: detail,
	}
}

func (p *provider) IntEvaluation(ctx context.Context, flag string, defaultValue int64, evalCtx openfeature.FlattenedContext) openfeature.IntResolutionDetail {
	// check if the feature is present in the default registry
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// get the default value from the feature from default registry
	value, detail, err := featuretypes.VariantValue[int64](feature, feature.DefaultVariant)
	if err != nil {
		return openfeature.IntResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// check if the feature is present in the featureVariants map
	variant, ok := p.featureVariants[feature.Name]
	if ok {
		// return early as we have found the value in the featureVariants map
		return openfeature.IntResolutionDetail{
			Value:                    variant.Value.(int64),
			ProviderResolutionDetail: detail,
		}
	}

	// return the value from the default registry we found earlier
	return openfeature.IntResolutionDetail{
		Value:                    value,
		ProviderResolutionDetail: detail,
	}
}

func (p *provider) ObjectEvaluation(ctx context.Context, flag string, defaultValue any, evalCtx openfeature.FlattenedContext) openfeature.InterfaceResolutionDetail {
	// check if the feature is present in the default registry
	feature, detail, err := p.registry.GetByString(flag)
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// get the default value from the feature from default registry
	value, detail, err := featuretypes.VariantValue[any](feature, feature.DefaultVariant)
	if err != nil {
		return openfeature.InterfaceResolutionDetail{
			Value:                    defaultValue,
			ProviderResolutionDetail: detail,
		}
	}

	// check if the feature is present in the featureVariants map
	variant, ok := p.featureVariants[feature.Name]
	if ok {
		// return early as we have found the value in the featureVariants map
		return openfeature.InterfaceResolutionDetail{
			Value:                    variant.Value,
			ProviderResolutionDetail: detail,
		}
	}

	// return the value from the default registry we found earlier
	return openfeature.InterfaceResolutionDetail{
		Value:                    value,
		ProviderResolutionDetail: detail,
	}
}

func (provider *provider) Hooks() []openfeature.Hook {
	return []openfeature.Hook{}
}

func (p *provider) List(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
	result := make([]*featuretypes.GettableFeature, 0, len(p.featureVariants))

	for featureName, variant := range p.featureVariants {
		feature, _, err := p.registry.Get(featureName)
		if err != nil {
			return nil, err
		}
		result = append(result, &featuretypes.GettableFeature{
			Name:           feature.Name.String(),
			Kind:           feature.Kind.StringValue(),
			Stage:          feature.Stage.StringValue(),
			Description:    feature.Description,
			DefaultVariant: feature.DefaultVariant.String(),
			Variants:       nil,
			ResolvedValue:  variant.Value,
		})
	}

	return result, nil
}
