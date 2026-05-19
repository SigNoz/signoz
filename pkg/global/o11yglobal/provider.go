package o11yglobal

import (
	"context"

	"github.com/hanzoai/o11y/pkg/factory"
	"github.com/hanzoai/o11y/pkg/global"
)

type provider struct {
	config   global.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[global.Global, global.Config] {
	return factory.NewProviderFactory(factory.MustNewName("observe"), func(ctx context.Context, providerSettings factory.ProviderSettings, config global.Config) (global.Global, error) {
		return newProvider(ctx, providerSettings, config)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config global.Config) (global.Global, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/hanzoai/o11y/pkg/global/o11yglobal")
	return &provider{
		config:   config,
		settings: settings,
	}, nil
}

func (provider *provider) GetConfig() global.Config {
	return provider.config
}
