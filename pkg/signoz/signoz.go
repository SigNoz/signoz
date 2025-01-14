package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"

	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/migrations"
	"go.signoz.io/signoz/pkg/web"
)

type SigNoz struct {
	Cache    cache.Cache
	Web      web.Web
	SQLStore sqlstore.SQLStore
}

func New(ctx context.Context, instrumentation instrumentation.Instrumentation, config Config, factories ProviderFactories) (*SigNoz, error) {
	providerSettings := instrumentation.ToProviderSettings()

	cache, err := factory.NewFromFactory(ctx, providerSettings, config.Cache, factories.CacheProviderFactories, config.Cache.Provider)
	if err != nil {
		return nil, err
	}

	web, err := factory.NewFromFactory(ctx, providerSettings, config.Web, factories.WebProviderFactories, config.Web.GetProvider())
	if err != nil {
		return nil, err
	}

	sqlStoreProvider, err := factory.NewFromFactory(ctx, providerSettings, config.SQLStore, factories.SQLStoreProviderFactories, config.SQLStore.Provider)
	if err != nil {
		return nil, err
	}

	migrations, err := migrations.New(ctx, providerSettings, config.SQLStore, factories.SQLStoreMigrationFactories)
	if err != nil {
		return nil, err
	}

	sqlStore := sqlstore.NewSQLStore(sqlStoreProvider, migrations)

	err = sqlStore.Migrate(ctx)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Cache:    cache,
		Web:      web,
		SQLStore: sqlStore,
	}, nil
}
