package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlstore/sqlstoremigrator"

	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/web"
)

type SigNoz struct {
	Cache            cache.Cache
	Web              web.Web
	SQLStore         sqlstore.SQLStore
	SQLStoreMigrator sqlstore.SQLStoreMigrator
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

	sqlStore, err := factory.NewFromFactory(ctx, providerSettings, config.SQLStore, factories.SQLStoreProviderFactories, config.SQLStore.Provider)
	if err != nil {
		return nil, err
	}

	migrations, err := sqlstoremigrator.NewMigrations(ctx, providerSettings, config.SQLStore, factories.SQLStoreMigrationFactories)
	if err != nil {
		return nil, err
	}

	sqlStoreMigrator := sqlstoremigrator.New(ctx, providerSettings, sqlStore, migrations, config.SQLStore)

	err = sqlStoreMigrator.Migrate(ctx)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Cache:    cache,
		Web:      web,
		SQLStore: sqlStore,
	}, nil
}
