package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/web"
)

type ProviderConfig struct {
	// Map of all cache provider factories
	CacheProviderFactories factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]]

	// Map of all web provider factories
	WebProviderFactories factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]]

	// Map of all sqlstore provider factories
	SQLStoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]]

	// Map of all sql migration provider factories
	SQLMigrationProviderFactories factory.NamedMap[factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config]]
}

// Config defines the entire input configuration of signoz.
type Config struct {
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`
	Web             web.Config             `mapstructure:"web"`
	Cache           cache.Config           `mapstructure:"cache"`
	SQLStore        sqlstore.Config        `mapstructure:"sqlstore"`
	SQLMigrator     sqlmigrator.Config     `mapstructure:"sqlmigrator"`
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig) (Config, error) {
	configFactories := []factory.ConfigFactory{
		instrumentation.NewConfigFactory(),
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
		sqlstore.NewConfigFactory(),
		sqlmigrator.NewConfigFactory(),
	}

	conf, err := config.New(ctx, resolverConfig, configFactories)
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := conf.Unmarshal("", &config); err != nil {
		return Config{}, err
	}

	return config, nil
}
