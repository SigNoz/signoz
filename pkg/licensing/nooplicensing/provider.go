package nooplicensing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type noopLicensing struct {
	stopChan chan struct{}
}

func NewFactory() factory.ProviderFactory[licensing.Licensing, licensing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config licensing.Config) (licensing.Licensing, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ licensing.Config) (licensing.Licensing, error) {
	return &noopLicensing{stopChan: make(chan struct{})}, nil
}

func (provider *noopLicensing) Start(context.Context) error {
	<-provider.stopChan
	return nil

}

func (provider *noopLicensing) Stop(context.Context) error {
	close(provider.stopChan)
	return nil
}

func (provider *noopLicensing) Activate(ctx context.Context, organizationID valuer.UUID, key string) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching license is not supported")
}

func (provider *noopLicensing) Validate(ctx context.Context) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "validating license is not supported")
}

func (provider *noopLicensing) Refresh(ctx context.Context, organizationID valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "refreshing license is not supported")
}

func (provider *noopLicensing) Checkout(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "checkout session is not supported")
}

func (provider *noopLicensing) Portal(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "portal session is not supported")
}

func (provider *noopLicensing) GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.License, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "fetching active license is not supported")
}

func (provider *noopLicensing) CheckFeature(ctx context.Context, key string) error {
	feature, err := provider.GetFeatureFlag(ctx, key)
	if err != nil {
		return err
	}

	if feature.Active {
		return nil
	}

	return errors.Newf(errors.TypeNotFound, licensing.ErrCodeFeatureUnavailable, "feature unavailable: %s", key)
}

func (provider *noopLicensing) GetFeatureFlag(ctx context.Context, key string) (*featuretypes.GettableFeature, error) {
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

func (provider *noopLicensing) GetFeatureFlags(ctx context.Context) ([]*featuretypes.GettableFeature, error) {
	return licensetypes.DefaultFeatureSet, nil
}

func (provider *noopLicensing) InitFeatures(ctx context.Context, features []*featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "init features is not supported")
}

func (provider *noopLicensing) UpdateFeatureFlag(ctx context.Context, feature *featuretypes.GettableFeature) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "updating feature flag is not supported")
}
