package nooplicensing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	stopC   chan struct{}
	license licensetypes.License
}

func NewFactory() factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
	return &provider{
		stopC:   make(chan struct{}),
		license: licensetypes.NewNoop(),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) GetLicenses(ctx context.Context, orgID valuer.UUID, params licensetypes.GettableLicenseParams) (licensetypes.GettableLicenses, error) {
	return licensetypes.GettableLicenses{provider.license}, nil
}

func (provider *provider) GetLatestLicense(ctx context.Context, orgID valuer.UUID) (licensetypes.License, error) {
	return provider.license, nil
}

func (provider *provider) SetLicense(ctx context.Context, orgID valuer.UUID, key string) error {
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return nil
}
