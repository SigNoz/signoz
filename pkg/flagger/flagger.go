package flagger

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

type Provider interface {
	openfeature.FeatureProvider

	List(ctx context.Context, evalCtx featuretypes.EvaluationContext) ([]*featuretypes.GettableFeature, error)
}

type Flagger interface {
	BooleanValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (bool, error)

	StringValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (string, error)

	FloatValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (float64, error)

	IntValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (int64, error)

	ObjectValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (interface{}, error)

	List(ctx context.Context, evalCtx featuretypes.EvaluationContext) ([]*featuretypes.GettableFeature, error)
}

type flagger struct {
	registry  featuretypes.Registry
	settings  factory.ScopedProviderSettings
	providers map[string]Provider
	clients   map[string]*openfeature.Client
}

func New(ctx context.Context, registry featuretypes.Registry, cfg Config, providerSettings factory.ProviderSettings, factories ...factory.ProviderFactory[Provider, Config]) (Flagger, error) {
	providers := make(map[string]Provider)
	clients := make(map[string]*openfeature.Client)
	for _, factory := range factories {
		provider, err := factory.New(ctx, providerSettings, cfg)
		if err != nil {
			return nil, err
		}

		providers[provider.Metadata().Name] = provider
		clients[provider.Metadata().Name] = openfeature.NewClient(provider.Metadata().Name)
		if err := openfeature.SetNamedProviderAndWait(provider.Metadata().Name, provider); err != nil {
			return nil, err
		}
	}

	return &flagger{
		registry:  registry,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/flagger"),
		providers: providers,
		clients:   clients,
	}, nil
}

func (flagger *flagger) BooleanValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (bool, error) {
	feature, _, err := flagger.registry.Get(flag)
	if err != nil {
		flagger.settings.Logger().ErrorContext(ctx, "failed to get feature from registry, defaulting to false", "error", err)
		return false, err
	}

	defaultValue, _, err := featuretypes.GetFeatureVariantValue[bool](feature, feature.DefaultVariant)
	if err != nil {
		// This should never happen
		flagger.settings.Logger().ErrorContext(ctx, "failed to get default variant value from registry, defaulting to false", "error", err)
		return false, err
	}

	for _, client := range flagger.clients {
		featureValue, err := client.BooleanValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			continue
		}

		if featureValue != defaultValue {
			return featureValue, nil
		}
	}

	return defaultValue, nil
}

func (flagger *flagger) StringValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (string, error) {
	feature, _, err := flagger.registry.Get(flag)
	if err != nil {
		flagger.settings.Logger().ErrorContext(ctx, "failed to get feature from registry, defaulting to empty string", "error", err)
		return "", err
	}

	defaultValue, _, err := featuretypes.GetFeatureVariantValue[string](feature, feature.DefaultVariant)
	if err != nil {
		// This should never happen
		flagger.settings.Logger().ErrorContext(ctx, "failed to get default variant value from registry, defaulting to empty string", "error", err)
		return "", err
	}

	for _, client := range flagger.clients {
		featureValue, err := client.StringValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			continue
		}

		if featureValue != defaultValue {
			return featureValue, nil
		}
	}

	return defaultValue, nil
}

func (flagger *flagger) FloatValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (float64, error) {
	feature, _, err := flagger.registry.Get(flag)
	if err != nil {
		flagger.settings.Logger().ErrorContext(ctx, "failed to get feature from registry, defaulting to 0", "error", err)
		return 0, err
	}

	defaultValue, _, err := featuretypes.GetFeatureVariantValue[float64](feature, feature.DefaultVariant)
	if err != nil {
		// This should never happen
		flagger.settings.Logger().ErrorContext(ctx, "failed to get default variant value from registry, defaulting to 0", "error", err)
		return 0, err
	}

	for _, client := range flagger.clients {
		featureValue, err := client.FloatValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			continue
		}

		if featureValue != defaultValue {
			return featureValue, nil
		}
	}

	return defaultValue, nil
}

func (flagger *flagger) IntValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (int64, error) {
	feature, _, err := flagger.registry.Get(flag)
	if err != nil {
		flagger.settings.Logger().ErrorContext(ctx, "failed to get feature from registry, defaulting to 0", "error", err)
		return 0, err
	}

	defaultValue, _, err := featuretypes.GetFeatureVariantValue[int64](feature, feature.DefaultVariant)
	if err != nil {
		// This should never happen
		flagger.settings.Logger().ErrorContext(ctx, "failed to get default variant value from registry, defaulting to 0", "error", err)
		return 0, err
	}

	for _, client := range flagger.clients {
		featureValue, err := client.IntValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			continue
		}

		if featureValue != defaultValue {
			return featureValue, nil
		}
	}

	return defaultValue, nil
}

func (flagger *flagger) ObjectValue(ctx context.Context, flag featuretypes.Name, evalCtx featuretypes.EvaluationContext) (interface{}, error) {
	feature, _, err := flagger.registry.Get(flag)
	if err != nil {
		flagger.settings.Logger().ErrorContext(ctx, "failed to get feature from registry, defaulting to empty slice", "error", err)
		return []any{}, err
	}

	defaultValue, _, err := featuretypes.GetFeatureVariantValue[interface{}](feature, feature.DefaultVariant)
	if err != nil {
		// This should never happen
		flagger.settings.Logger().ErrorContext(ctx, "failed to get default variant value from registry, defaulting to empty slice", "error", err)
		return []any{}, err
	}

	for _, client := range flagger.clients {
		featureValue, err := client.ObjectValue(ctx, flag.String(), defaultValue, evalCtx.Ctx())
		if err != nil {
			continue
		}

		if featureValue != defaultValue {
			return featureValue, nil
		}
	}

	return defaultValue, nil
}

func (flagger *flagger) List(ctx context.Context, evalCtx featuretypes.EvaluationContext) ([]*featuretypes.GettableFeature, error) {
	features := make([]*featuretypes.GettableFeature, 0)

	wg := sync.WaitGroup{}
	mtx := sync.Mutex{}

	for _, provider := range flagger.providers {
		wg.Add(1)
		go func(provider Provider) {
			defer wg.Done()
			providerFeatures, err := provider.List(ctx, evalCtx)
			if err != nil {
				flagger.settings.Logger().ErrorContext(ctx, "failed to get feature list from provider", "error", err)
				return
			}

			mtx.Lock()
			features = append(features, providerFeatures...)
			mtx.Unlock()
		}(provider)
	}
	wg.Wait()

	return features, nil
}
