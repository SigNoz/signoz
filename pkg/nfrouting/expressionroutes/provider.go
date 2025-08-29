package expressionroutes

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/nfrouting"
	"github.com/SigNoz/signoz/pkg/types/nfroutingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// provider handles expression-based routing for notifications
type provider struct {
	routeStore nfroutingtypes.RouteStore
}

func NewFactory(store nfroutingtypes.RouteStore) factory.ProviderFactory[nfrouting.NotificationRoutes, nfrouting.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("expression"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfrouting.Config) (nfrouting.NotificationRoutes, error) {
			return New(ctx, settings, store)
		},
	)
}

// New creates a new rule-based grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, store nfroutingtypes.RouteStore) (nfrouting.NotificationRoutes, error) {
	_ = factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfrouting/expressionroutes")

	return &provider{
		routeStore: store,
	}, nil
}

func (p *provider) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, nil
}
