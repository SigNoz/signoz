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

type noopLicense struct{}

func NewFactory() factory.ProviderFactory[licensing.License, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.License, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ licensing.Config) (licensing.License, error) {
	return &noopLicense{}, nil
}

func (n *noopLicense) Start(context.Context) error {
	return nil
}

func (n *noopLicense) Stop(context.Context) error {
	return nil
}

func (n *noopLicense) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching license is not supported")
}

func (n *noopLicense) Validate(ctx context.Context, organizationID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "validating  license is not supported")
}

func (n *noopLicense) Update(ctx context.Context, organizationID valuer.UUID, license *licensetypes.GettableLicense) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "updating license is not supported")
}

func (n *noopLicense) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "refreshing license is not supported")
}

func (n *noopLicense) Get(ctx context.Context, organizationID valuer.UUID, ID valuer.UUID) (*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching license for ID is not supported")
}

func (n *noopLicense) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching active license is not supported")
}

func (n *noopLicense) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.GettableLicense, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching all licenses is not supported")
}

func (n *noopLicense) CheckFeature(ctx context.Context, key string) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "checking feature is not supported")
}

func (n *noopLicense) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching feature flag is not supported")
}

func (n *noopLicense) GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching all feature flags is not supported")
}

func (n *noopLicense) InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "init features is not supported")
}

func (n *noopLicense) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching organizations is not supported")
}

func (n *noopLicense) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "updating feature flag is not supported")
}
