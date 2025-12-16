package signozingestion

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/ingestion"
)

type provider struct {
	config   ingestion.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[ingestion.Ingestion, ingestion.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config ingestion.Config) (ingestion.Ingestion, error) {
		return newProvider(ctx, providerSettings, config)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config ingestion.Config) (ingestion.Ingestion, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/ingestion/signozingestion")
	return &provider{
		config:   config,
		settings: settings,
	}, nil
}

func (provider *provider) GetConfig() ingestion.Config {
	return provider.config
}
