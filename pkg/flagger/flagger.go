package flagger

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

// This is the consumer facing interface for the Flagger service.
type Flagger interface {
	Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (bool, error)
	String(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (string, error)
	Float(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (float64, error)
	Int(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (int64, error)
	Object(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (any, error)
	List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext) ([]*featuretypes.Feature, error)
}

// This is the concrete implementation of the Flagger interface.
type flagger struct {
	defaultRegistry featuretypes.Registry
	settings        factory.ScopedProviderSettings
	providers       map[string]Provider
	clients         map[string]*openfeature.Client
}

func New(ctx context.Context, ps factory.ProviderSettings, config Config, defaultRegistry featuretypes.Registry, factories ...factory.ProviderFactory[Provider, Config]) (Flagger, error) {

	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagger")

	providers := make(map[string]Provider)
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
		defaultRegistry: defaultRegistry,
		settings:        settings,
		providers:       providers,
		clients:         clients,
	}, nil
}

func (f *flagger) Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (bool, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.defaultRegistry.GetByString(flag)
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
		value, err := client.BooleanValue(ctx, flag, defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().ErrorContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name())
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) String(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (string, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.defaultRegistry.GetByString(flag)
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
		value, err := client.StringValue(ctx, flag, defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name())
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Float(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (float64, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.defaultRegistry.GetByString(flag)
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
		value, err := client.FloatValue(ctx, flag, defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name())
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Int(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (int64, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.defaultRegistry.GetByString(flag)
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
		value, err := client.IntValue(ctx, flag, defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name())
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) Object(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext) (any, error) {
	// check if the feature is present in the default registry
	feature, _, err := f.defaultRegistry.GetByString(flag)
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
		value, err := client.ObjectValue(ctx, flag, defaultValue, evalCtx.Ctx())
		if err != nil {
			f.settings.Logger().WarnContext(ctx, "failed to get value from client", "error", err, "flag", flag, "client", client.Metadata().Name())
			continue
		}

		if value != defaultValue {
			return value, nil
		}
	}

	return defaultValue, nil
}

func (f *flagger) List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext) ([]*featuretypes.Feature, error) {
	// TODO: complete this
	return nil, nil
}
