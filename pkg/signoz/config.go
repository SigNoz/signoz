package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/web"
)

// Config defines the entire configuration of signoz.
type Config struct {
	Web   web.Config   `mapstructure:"web"`
	Cache cache.Config `mapstructure:"cache"`
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig) (Config, error) {
	configFactories := []config.ConfigFactory{
		web.NewConfigFactory(),
		cache.NewConfigFactory(),
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
