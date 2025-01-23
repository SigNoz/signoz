package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/version"

	"go.signoz.io/signoz/pkg/web"
)

type SigNoz struct {
	Cache    cache.Cache
	Web      web.Web
	SQLStore sqlstore.SQLStore
}

func New(
	ctx context.Context,
	config Config,
	providerConfig ProviderConfig,
) (*SigNoz, error) {
	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, version.Build{}, config.Instrumentation)
	if err != nil {
		return nil, err
	}

	// Get the provider settings from instrumentation
	providerSettings := instrumentation.ToProviderSettings()

	// Initialize cache from the available cache provider factories
	cache, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Cache,
		providerConfig.CacheProviderFactories,
		config.Cache.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize web from the available web provider factories
	web, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Web,
		providerConfig.WebProviderFactories,
		config.Web.Provider(),
	)
	if err != nil {
		return nil, err
	}

	// Initialize sqlstore from the available sqlstore provider factories
	sqlstore, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.SQLStore,
		providerConfig.SQLStoreProviderFactories,
		config.SQLStore.Provider,
	)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Cache:    cache,
		Web:      web,
		SQLStore: sqlstore,
	}, nil
}
