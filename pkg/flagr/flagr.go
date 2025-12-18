package flagr

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/open-feature/go-sdk/openfeature"
)

// This is the consumer facing interface for the Flagr service.
type Flagr interface {
	Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue bool) (bool, error)
	String(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue string) (string, error)
	Float(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue float64) (float64, error)
	Int(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue int64) (int64, error)
	Object(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue any) (any, error)
	List(ctx context.Context, evalCtx featuretypes.FlagrEvaluationContext) []any // TODO: Add type
}

// This is the concrete implementation of the Flagr interface.
type flagr struct {
	settings  factory.ScopedProviderSettings
	providers map[string]Provider
	clients   map[string]*openfeature.Client
}

func New(ctx context.Context, ps factory.ProviderSettings, config Config, factories ...factory.ProviderFactory[Provider, Config]) (Flagr, error) {

	settings := factory.NewScopedProviderSettings(ps, "github.com/SigNoz/signoz/pkg/flagr")

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

	return &flagr{
		settings:  settings,
		providers: providers,
		clients:   clients,
	}, nil
}

func (f *flagr) Boolean(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue bool) (bool, error) {
	
	

	return defaultValue, nil
}

func (f *flagr) String(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue string) (string, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagr) Float(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue float64) (float64, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagr) Int(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue int64) (int64, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagr) Object(ctx context.Context, flag string, evalCtx featuretypes.FlagrEvaluationContext, defaultValue any) (any, error) {
	// TODO: complete this
	return defaultValue, nil
}

func (f *flagr) List(ctx context.Context, evalCtx featuretypes.FlagrEvaluationContext) []any {
	// TODO: complete this
	return nil
}
