package analyticstest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

var _ analytics.Analytics = (*Provider)(nil)

type Provider struct {
	stopC chan struct{}
}

func New() *Provider {
	return &Provider{stopC: make(chan struct{})}
}

func (provider *Provider) Start(_ context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *Provider) Send(ctx context.Context, messages ...analyticstypes.Message) {}

func (provider *Provider) Stop(_ context.Context) error {
	close(provider.stopC)
	return nil
}
