package segmentanalytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
	segment "github.com/segmentio/analytics-go/v3"
)

type provider struct {
	settings factory.ScopedProviderSettings
	client   segment.Client
	startC   chan struct{}
}

func NewProviderFactory() factory.ProviderFactory[analytics.Analytics, analytics.Config] {
	return factory.NewProviderFactory(factory.MustNewName("segment"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config analytics.Config) (analytics.Analytics, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/analytics/segmentanalytics")

	return &provider{
		settings: settings,
		client:   segment.New(config.Key),
		startC:   make(chan struct{}),
	}, nil
}

func (provider *provider) Start(_ context.Context) error {
	<-provider.startC
	return nil
}

func (provider *provider) Send(ctx context.Context, messages ...analyticstypes.Message) {
	for _, message := range messages {
		err := provider.client.Enqueue(message)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "unable to send message to segment", "err", err)
		}
	}
}

func (provider *provider) Stop(_ context.Context) error {
	close(provider.startC)
	return nil
}
