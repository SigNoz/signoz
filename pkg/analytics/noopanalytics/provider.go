package noopanalytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

type provider struct {
	stopC chan struct{}
}

func NewFactory() factory.ProviderFactory[analytics.Analytics, analytics.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config analytics.Config) (analytics.Analytics, error) {
	return &provider{
		stopC: make(chan struct{}),
	}, nil
}

func (provider *provider) Start(_ context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) Send(ctx context.Context, messages ...analyticstypes.Message) {}

func (provider *provider) Stop(_ context.Context) error {
	close(provider.stopC)
	return nil
}
