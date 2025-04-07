package implzeus

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/metertypes"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type Provider struct {
	settings factory.ScopedProviderSettings
	config   zeus.Config
	client   *client.Client
}

func NewProviderFactory() factory.ProviderFactory[zeus.Zeus, zeus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("impl"), func(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/zeus/implzeus")

	httpClient := client.New(
		settings.Logger(),
		providerSettings.TracerProvider,
		providerSettings.MeterProvider,
		client.WithRequestResponseLog(true),
		client.WithRetryCount(3),
	)

	return &Provider{
		settings: settings,
		config:   config,
		client:   httpClient,
	}, nil
}

func (provider *Provider) GetLicense(ctx context.Context, key string) (*licensetypes.License, error) {
	return nil, nil
}

func (provider *Provider) GetCheckoutURL(ctx context.Context, key string) (string, error) {
	return "", nil
}

func (provider *Provider) GetPortalURL(ctx context.Context, key string) (string, error) {
	return "", nil
}

func (provider *Provider) GetDeployment(ctx context.Context, key string) ([]byte, error) {
	return nil, nil
}

func (provider *Provider) PutMeters(ctx context.Context, key string, meters metertypes.Meters) error {
	return nil
}
