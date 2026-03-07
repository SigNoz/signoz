package signozglobal

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/global"
)

type provider struct {
	config   global.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[global.Global, global.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config global.Config) (global.Global, error) {
		return newProvider(ctx, providerSettings, config)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config global.Config) (global.Global, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/global/signozglobal")
	return &provider{
		config:   config,
		settings: settings,
	}, nil
}

func (provider *provider) GetConfig() global.Config {
	return provider.config
}
