package internalalertmanager

import (
	"context"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

var _ alertmanager.Alertmanager = (*provider)(nil)

type provider struct {
	*alertmanager.Service
	ticker *time.Ticker
	syncC  chan struct{}
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("internal"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore) (alertmanager.Alertmanager, error) {
	ticker := time.NewTicker(config.Internal.PollInterval)
	syncC := make(chan struct{})

	return &provider{
		Service: alertmanager.New(
			ctx,
			factory.NewScopedProviderSettings(settings, "go.signoz.io/signoz/pkg/alertmanager/internalalertmanager"),
			config,
			sqlalertmanagerstore.NewStateStore(sqlstore),
			sqlalertmanagerstore.NewConfigStore(sqlstore),
			alertmanager.SyncFunc(func(ctx context.Context) <-chan struct{} {
				go func() {
					select {
					case <-ticker.C:
						syncC <- struct{}{}
					case <-ctx.Done():
						return
					}
				}()
				return syncC
			}),
		),
		ticker: ticker,
		syncC:  syncC,
	}, nil
}

func (provider *provider) Stop(ctx context.Context) error {
	provider.ticker.Stop()
	close(provider.syncC)
	provider.Service.Stop(ctx)
	return nil
}
