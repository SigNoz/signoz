package noopstatsreporter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
)

type provider struct {
	stopC chan struct{}
}

func NewFactory() factory.ProviderFactory[statsreporter.StatsReporter, statsreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config statsreporter.Config) (statsreporter.StatsReporter, error) {
	return &provider{
		stopC: make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) Report(ctx context.Context) error {
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return nil
}
