package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/apiserver"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/web"
)

// Config defines the entire input configuration of signoz.
type Config struct {
	// Instrumentation config
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`

	// Web config
	Web web.Config `mapstructure:"web"`

	// Cache config
	Cache cache.Config `mapstructure:"cache"`

	// SQLStore config
	SQLStore sqlstore.Config `mapstructure:"sqlstore"`

	// SQLMigrator config
	SQLMigrator sqlmigrator.Config `mapstructure:"sqlmigrator"`

	// API Server config
	APIServer apiserver.Config `mapstructure:"apiserver"`
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig) (Config, error) {
	configFactories := []factory.ConfigFactory{
		instrumentation.NewConfigFactory(),
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
		sqlstore.NewConfigFactory(),
		sqlmigrator.NewConfigFactory(),
		apiserver.NewConfigFactory(),
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
