package configflagger

import (
	"context"
	"fmt"
	"strconv"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

type provider struct {
	config   flagger.Config
	settings factory.ScopedProviderSettings
	// This is the default registry that will be containing all the supported features along with there all possible variants
	defaultRegistry featuretypes.Registry
	// These are the feature variants that are configured in the config file and will be used as overrides
	featureVariants map[featuretypes.Name]featuretypes.FeatureVariant
}

func NewFactory(defaultRegistry featuretypes.Registry) factory.ProviderFactory[flagger.Provider, flagger.Config] {
	return factory.NewProviderFactory(factory.MustNewName("config"), func(ctx context.Context, ps factory.ProviderSettings, c flagger.Config) (flagger.Provider, error) {
		return New(ctx, ps, c, defaultRegistry)
	})
}

func New(ctx context.Context, ps factory.ProviderSettings, c flagger.Config, defaultRegistry featuretypes.Registry) (flagger.Provider, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagger/configflagger")

	featureVariants := make(map[featuretypes.Name]featuretypes.FeatureVariant)

	// read all the values from the config and build the featureVariants map
	for key, value := range c.Config {
		// Check if the feature is valid
		feature, _, err := defaultRegistry.GetByString(key)
		if err != nil {
			return nil, err
		}

		if feature.Kind == featuretypes.KindObject {
			// simply add the value to the featureVariants map
			featureVariants[feature.Name] = featuretypes.FeatureVariant{
				Variant: featuretypes.MustNewName("from_config"),
				Value:   value,
			}
			continue
		}

		convertedValue, err := convertValueToKind(value, featuretypes.Kind(feature.Kind))
		if err != nil {
			return nil, err
		}

		// check if the value is valid
		if ok, err := featuretypes.IsValidValue(feature, convertedValue); err != nil || !ok {
			return nil, err
		}

		// get the variant by value
		variant, err := featuretypes.VariantByValue(feature, convertedValue)
		if err != nil {
			return nil, err
		}

		// add the variant to the featureVariants map
		featureVariants[feature.Name] = *variant
	}

	return &provider{
		config:          c,
		settings:        settings,
		defaultRegistry: defaultRegistry,
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
	feature, detail, err := p.defaultRegistry.GetByString(flag)
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
	feature, detail, err := p.defaultRegistry.GetByString(flag)
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
	feature, detail, err := p.defaultRegistry.GetByString(flag)
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
	feature, detail, err := p.defaultRegistry.GetByString(flag)
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
	feature, detail, err := p.defaultRegistry.GetByString(flag)
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
	return nil, nil
}

func convertValueToKind(value any, kind featuretypes.Kind) (any, error) {
	switch kind {
	case featuretypes.KindBoolean:
		switch v := value.(type) {
		case bool:
			return v, nil
		case string:
			return strconv.ParseBool(v)
		default:
			return nil, fmt.Errorf("cannot convert %T to bool", value)
		}
	case featuretypes.KindString:
		return fmt.Sprintf("%v", value), nil
	case featuretypes.KindInt:
		switch v := value.(type) {
		case int64:
			return v, nil
		case int:
			return int64(v), nil
		case float64:
			return int64(v), nil
		case string:
			return strconv.ParseInt(v, 10, 64)
		default:
			return nil, fmt.Errorf("cannot convert %T to int64", value)
		}
	case featuretypes.KindFloat:
		switch v := value.(type) {
		case float64:
			return v, nil
		case int:
			return float64(v), nil
		case string:
			return strconv.ParseFloat(v, 64)
		default:
			return nil, fmt.Errorf("cannot convert %T to float64", value)
		}
	default:
		return value, nil
	}
}
