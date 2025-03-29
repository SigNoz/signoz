package zeus

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/client"
)

type Provider struct {
	settings factory.ScopedProviderSettings
	config   Config
	client   *client.Client
}

func NewProvider(inputSettings factory.ProviderSettings, scope string, config Config) *Provider {
	settings := factory.NewScopedProviderSettings(inputSettings, scope)

	httpClient := client.New(
		settings.Logger(),
		inputSettings.TracerProvider,
		inputSettings.MeterProvider,
		client.WithRequestResponseLog(true),
		client.WithRetryCount(3),
	)

	return &Provider{
		settings: settings,
		config:   config,
		client:   httpClient,
	}
}
