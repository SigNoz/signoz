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

func (provider *Provider) TrackGroup(ctx context.Context, group, event string, attributes map[string]any) {
}

func (provider *Provider) TrackUser(ctx context.Context, group, user, event string, attributes map[string]any) {
}

func (provider *Provider) IdentifyGroup(ctx context.Context, group string, traits map[string]any) {
}

func (provider *Provider) IdentifyUser(ctx context.Context, group, user string, traits map[string]any) {
}

func (provider *Provider) Stop(_ context.Context) error {
	close(provider.stopC)
	return nil
}
