package httpgateway

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/http/client"
	"github.com/SigNoz/signoz/pkg/licensing"
)

type Provider struct {
	settings   factory.ScopedProviderSettings
	config     gateway.Config
	httpClient *client.Client
	licensing  licensing.Licensing
}

func NewProviderFactory(licensing licensing.Licensing) factory.ProviderFactory[gateway.Gateway, gateway.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, ps factory.ProviderSettings, c gateway.Config) (gateway.Gateway, error) {
		return New(ctx, ps, c, licensing)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config gateway.Config, licensing licensing.Licensing) (gateway.Gateway, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/gateway/httpgateway")

	httpClient, err := client.New(
		settings.Logger(),
		providerSettings.TracerProvider,
		providerSettings.MeterProvider,
		client.WithRequestResponseLog(true),
		client.WithRetryCount(3),
	)
	if err != nil {
		return nil, err
	}

	return &Provider{
		settings:   settings,
		config:     config,
		httpClient: httpClient,
	}, nil
}

// GetIngestionKeysByWorkspaceID implements [gateway.Gateway].
func (provider *Provider) GetIngestionKeysByWorkspaceID(ctx context.Context, workspaceID string, page int, perPage int) ([]byte, error) {
	panic("to-do--fix-this")
}
