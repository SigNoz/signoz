package pollinglicensing

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/licensingstore/sqllicensingstore"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type provider struct {
	config   licensing.Config
	settings factory.ScopedProviderSettings
	zeus     zeus.Zeus
	service  *Service
	store    licensetypes.Store
	stopC    chan struct{}
}

func NewFactory(zeus zeus.Zeus, sqlstore sqlstore.SQLStore) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sql"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config, zeus, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config, zeus zeus.Zeus, sqlstore sqlstore.SQLStore) (licensing.Licensing, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/licensing/pollinglicensing")
	store := sqllicensingstore.NewStore(sqlstore)

	return &provider{
		config:   config,
		settings: settings,
		zeus:     zeus,
		service:  NewService(ctx, settings, config, store, zeus),
		stopC:    make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	if err := provider.service.SyncServers(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to sync licensing servers", "error", err)
		return err
	}

	ticker := time.NewTicker(provider.config.PollingConfig.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			if err := provider.service.SyncServers(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to sync licensing servers", "error", err)
			}
		}
	}
}

func (provider *provider) GetLatestLicense(ctx context.Context, orgID valuer.UUID) (licensetypes.License, error) {
	server, err := provider.service.getServer(orgID)
	if err != nil {
		return nil, err
	}

	return server.GetLicense(ctx), nil
}

func (provider *provider) GetLicenses(ctx context.Context, orgID valuer.UUID, params licensetypes.GettableLicenseParams) (licensetypes.GettableLicenses, error) {
	if params.Active != nil {
		if *params.Active {
			license, err := provider.GetLatestLicense(ctx, orgID)
			if err != nil {
				return nil, err
			}

			return licensetypes.GettableLicenses{license}, nil
		}
	}

	licenses, err := provider.store.Get(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return licenses, nil
}

func (provider *provider) SetLicense(ctx context.Context, orgID valuer.UUID, key string) error {
	license, err := provider.zeus.GetLicense(ctx, key)
	if err != nil {
		return err
	}

	if err := provider.store.Set(ctx, license); err != nil {
		return err
	}

	return provider.service.SyncOrgServer(ctx, orgID)
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return nil
}
