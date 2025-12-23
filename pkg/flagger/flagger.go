package flagger

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

// This is the consumer facing interface for the Flagger service.
type Flagger interface {
	Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue bool) (bool, error)
	String(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue string) (string, error)
	Float(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue float64) (float64, error)
	Int(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue int64) (int64, error)
	Object(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue any) (any, error)
	List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext) ([]*featuretypes.Feature, error)
}

// This is the concrete implementation of the Flagger interface.
type flagger struct {
	settings  factory.ScopedProviderSettings
	providers map[string]Provider
	clients   map[string]*openfeature.Client
}

func New(ctx context.Context, ps factory.ProviderSettings, config Config, factories ...factory.ProviderFactory[Provider, Config]) (Flagger, error) {

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
		settings:  settings,
		providers: providers,
		clients:   clients,
	}, nil
}

func (f *flagger) Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue bool) (bool, error) {

	return defaultValue, nil
}

func (f *flagger) String(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue string) (string, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagger) Float(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue float64) (float64, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagger) Int(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue int64) (int64, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagger) Object(ctx context.Context, flag string, evalCtx featuretypes.FlaggerEvaluationContext, defaultValue any) (any, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagger) List(ctx context.Context, evalCtx featuretypes.FlaggerEvaluationContext)  ([]*featuretypes.Feature, error) {
	// TODO: complete this
	return nil, nil
}
