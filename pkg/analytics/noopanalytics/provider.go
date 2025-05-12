package noopanalytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

type provider struct {
	settings factory.ScopedProviderSettings
	startC   chan struct{}
}

func NewProviderFactory() factory.ProviderFactory[analytics.Analytics, analytics.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config analytics.Config) (analytics.Analytics, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/analytics/noopanalytics")

	return &provider{
		settings: settings,
		startC:   make(chan struct{}),
	}, nil
}

func (provider *provider) Start(_ context.Context) error {
	<-provider.startC
	return nil
}

func (provider *provider) Send(ctx context.Context, messages ...analyticstypes.Message) {}

func (provider *provider) Stop(_ context.Context) error {
	close(provider.startC)
	return nil
}
