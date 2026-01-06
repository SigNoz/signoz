package flagger

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

// Any feature flag provider has to implement this interface.
type FlaggerProvider interface {
	openfeature.FeatureProvider

	// List returns all the feature flags
	List(ctx context.Context) ([]*featuretypes.GettableFeature, error)
}

// This is the consumer facing interface for the Flagger service.
type Flagger interface {
	// Returns value for the flag of kind boolean otherwise returns error
	Boolean(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (bool, error)

	// Returns value for the flag of kind string otherwise returns error
	String(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (string, error)

	// Returns value for the flag of kind float otherwise returns error
	Float(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (float64, error)

	// Returns value for the flag of kind int otherwise returns error
	Int(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (int64, error)

	// Returns value for the flag of kind object otherwise returns error
	Object(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (any, error)

	// Returns value for the flag of kind boolean otherwise returns empty (default) value
	BooleanOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) bool

	// Returns value for the flag of kind string otherwise returns empty (default) value
	StringOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) string

	// Returns value for the flag of kind float otherwise returns empty (default) value
	FloatOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) float64

	// Returns value for the flag of kind int otherwise returns empty (default) value
	IntOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) int64

	// Returns value for the flag of kind object otherwise returns empty (default) value
	ObjectOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) any

	// Returns all the features in the registry
	List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext) ([]*featuretypes.GettableFeature, error)
}

// This is the concrete implementation of the Flagger interface.
type flagger struct {
	registry  featuretypes.Registry
	settings  factory.ScopedProviderSettings
	providers map[string]FlaggerProvider
	clients   map[string]*openfeature.Client
}

func New(ctx context.Context, ps factory.ProviderSettings, config Config, registry featuretypes.Registry, factories ...factory.ProviderFactory[FlaggerProvider, Config]) (Flagger, error) {
	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagger")

	providers := make(map[string]FlaggerProvider)
	clients := make(map[string]*openfeature.Client)

	for _, factory := range factories {
		provider, err := factory.New(ctx, ps, config)
		if err != nil {
			return nil, err
		}

		providers[provider.Metadata().Name] = provider

		openfeatureClient := openfeature.NewClient(provider.Metadata().Name)

		if err := openfeature.SetNamedProviderAndWait(provider.Metadata().Name, provider); err != nil {
			return nil, err
		}

		clients[provider.Metadata().Name] = openfeatureClient
	}

	return &flagger{
		registry:  registry,
		settings:  settings,
		providers: providers,
		clients:   clients,
	}, nil
}

func (f *flagger) Boolean(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (bool, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.registry.Get(flag)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get feature from default registry", "error", err, "flag", flag)
		return false, err
	}

	// get the default value from the feature from default registry
	defaultValue, _, err := featuretypes.VariantValue[bool](feature, feature.DefaultVariant)
	if err != nil {
		// something which should never happen
		f.settings.Logger().ErrorContext(ctx, "failed to get default value from feature", "error", err, "flag", flag)
		return false, err
	}

	// * this logic can be optimised based on priority of the clients and short circuiting
	// now ask all the available clients for the value
	for _, client := range f.clients {
		value, err := client.BooleanValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().ErrorContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name)
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) String(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (string, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.registry.Get(flag)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get feature from default registry", "error", err, "flag", flag)
		return "", err
	}

	// get the default value from the feature from default registry
	defaultValue, _, err := featuretypes.VariantValue[string](feature, feature.DefaultVariant)
	if err != nil {
		// something which should never happen
		f.settings.Logger().ErrorContext(ctx, "failed to get default value from feature", "error", err, "flag", flag)
		return "", err
	}

	// * this logic can be optimised based on priority of the clients and short circuiting
	// now ask all the available clients for the value
	for _, client := range f.clients {
		value, err := client.StringValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name)
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Float(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (float64, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.registry.Get(flag)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get feature from default registry", "error", err, "flag", flag)
		return 0, err
	}

	// get the default value from the feature from default registry
	defaultValue, _, err := featuretypes.VariantValue[float64](feature, feature.DefaultVariant)
	if err != nil {
		// something which should never happen
		f.settings.Logger().ErrorContext(ctx, "failed to get default value from feature", "error", err, "flag", flag)
		return 0, err
	}

	// * this logic can be optimised based on priority of the clients and short circuiting
	// now ask all the available clients for the value
	for _, client := range f.clients {
		value, err := client.FloatValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name)
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Int(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (int64, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.registry.Get(flag)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get feature from default registry", "error", err, "flag", flag)
		return 0, err
	}

	// get the default value from the feature from default registry
	defaultValue, _, err := featuretypes.VariantValue[int64](feature, feature.DefaultVariant)
	if err != nil {
		// something which should never happen
		f.settings.Logger().ErrorContext(ctx, "failed to get default value from feature", "error", err, "flag", flag)
		return 0, err
	}

	// * this logic can be optimised based on priority of the clients and short circuiting
	// now ask all the available clients for the value
	for _, client := range f.clients {
		value, err := client.IntValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name)
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Object(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) (any, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.registry.Get(flag)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get feature from default registry", "error", err, "flag", flag)
		return nil, err
	}

	// get the default value from the feature from default registry
	defaultValue, _, err := featuretypes.VariantValue[any](feature, feature.DefaultVariant)
	if err != nil {
		// something which should never happen
		f.settings.Logger().ErrorContext(ctx, "failed to get default value from feature", "error", err, "flag", flag)
		return nil, err
	}

	// * this logic can be optimised based on priority of the clients and short circuiting
	// now ask all the available clients for the value
	for _, client := range f.clients {
		value, err := client.ObjectValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name)
			continue
		}

		// ! for object we do not compare with the default value for now, we will figure this out better in future coming releases
		// if value != defaultValue {
		// 	return value, nil
		// }
		return value, nil
	}

	return defaultValue, nil
}

func (f *flagger) BooleanOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) bool {
	defaultValue := false
	value, err := f.Boolean(ctx, flag, evalCtx)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get value from flagger service", "error", err, "flag", flag)
		return defaultValue
	}
	return value
}

func (f *flagger) StringOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) string {
	defaultValue := ""
	value, err := f.String(ctx, flag, evalCtx)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get value from flagger service", "error", err, "flag", flag)
		return defaultValue
	}
	return value
}

func (f *flagger) FloatOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) float64 {
	defaultValue := 0.0
	value, err := f.Float(ctx, flag, evalCtx)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get value from flagger service", "error", err, "flag", flag)
		return defaultValue
	}
	return value
}

func (f *flagger) IntOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) int64 {
	defaultValue := int64(0)
	value, err := f.Int(ctx, flag, evalCtx)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get value from flagger service", "error", err, "flag", flag)
		return defaultValue
	}
	return value
}

func (f *flagger) ObjectOrEmpty(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.FlaggerEvaluationContext) any {
	defaultValue := struct{}{}
	value, err := f.Object(ctx, flag, evalCtx)
	if err != nil {
		f.settings.Logger().ErrorContext(ctx, "failed to get value from flagger service", "error", err, "flag", flag)
		return defaultValue
	}
	return value
}

func (f *flagger) List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext) ([]*featuretypes.GettableFeature, error) {
	// get all the feature from the default registry
	allFeatures := f.registry.List()

	// make a map of name of feature -> the dict we want to create from all features
	featureMap := make(map[string]*featuretypes.GettableFeature, len(allFeatures))

	for _, feature := range allFeatures {
		variants := make(map[string]any, len(feature.Variants))
		for name, value := range feature.Variants {
			variants[name.String()] = value.Value
		}

		featureMap[feature.Name.String()] = &featuretypes.GettableFeature{
			Name:           feature.Name.String(),
			Kind:           feature.Kind.StringValue(),
			Stage:          feature.Stage.StringValue(),
			Description:    feature.Description,
			DefaultVariant: feature.DefaultVariant.String(),
			Variants:       variants,
			ResolvedValue:  feature.Variants[feature.DefaultVariant].Value,
		}
	}

	// now call each provider and fix the value in feature map
	for _, provider := range f.providers {
		pFeatures, err := provider.List(ctx)
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get features from provider", "error", err, "provider", provider.Metadata().Name)
			continue
		}

		// merge
		for _, pFeature := range pFeatures {
			if existing, ok := featureMap[pFeature.Name]; ok {
				existing.ResolvedValue = pFeature.ResolvedValue
			}
		}
	}

	result := make([]*featuretypes.GettableFeature, 0, len(allFeatures))

	for _, f := range featureMap {
		result = append(result, f)
	}

	return result, nil
}
