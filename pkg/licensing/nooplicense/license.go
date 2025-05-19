package nooplicense

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type noopLicense struct {
	stopChan chan struct{}
}

func NewFactory() factory.ProviderFactory[licensing.License, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.License, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ licensing.Config) (licensing.License, error) {
	return &noopLicense{stopChan: make(chan struct{})}, nil
}

func (provider *noopLicense) Start(context.Context) error {
	<-provider.stopChan
	return nil

}

func (provider *noopLicense) Stop(context.Context) error {
	close(provider.stopChan)
	return nil
}

func (provider *noopLicense) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching license is not supported")
}

func (provider *noopLicense) Validate(ctx context.Context) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "validating  license is not supported")
}

func (provider *noopLicense) Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.GettableLicense) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "updating license is not supported")
}

func (provider *noopLicense) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "refreshing license is not supported")
}

func (provider *noopLicense) Get(ctx context.Context, organizationID valuer.UUID, ID valuer.UUID) (*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching license for ID is not supported")
}

func (provider *noopLicense) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching active license is not supported")
}

func (provider *noopLicense) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching all licenses is not supported")
}

func (provider *noopLicense) CheckFeature(ctx context.Context, key string) error {
	feature, err := provider.GetFeatureFlag(ctx, key)
	if err != nil {
		return err
	}

	if feature.Active {
		return nil
	}

	return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no feature active with given key: %s", key)
}

func (provider *noopLicense) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error) {
	features, err := provider.GetFeatureFlags(ctx)
	if err != nil {
		return nil, err
	}
	for _, feature := range features {
		if feature.Name == key {
			return feature, nil
		}
	}
	return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no feature available with given key: %s", key)
}

func (provider *noopLicense) GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
	return licensetypes.DefaultFeatureSet, nil
}

func (provider *noopLicense) InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "init features is not supported")
}

func (provider *noopLicense) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching organizations is not supported")
}

func (provider *noopLicense) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "updating feature flag is not supported")
}
