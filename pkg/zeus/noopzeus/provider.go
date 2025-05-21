package noopzeus

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type provider struct{}

func NewProviderFactory() factory.ProviderFactory[zeus.Zeus, zeus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ zeus.Config) (zeus.Zeus, error) {
	return &provider{}, nil
}

func (provider *provider) GetLicense(_ context.Context, _ string) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "fetching license is not supported")
}

func (provider *provider) GetCheckoutURL(_ context.Context, _ string, _ []byte) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "getting the checkout url is not supported")
}

func (provider *provider) GetPortalURL(_ context.Context, _ string, _ []byte) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "getting the portal url is not supported")
}

func (provider *provider) GetDeployment(_ context.Context, _ string) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "getting the deployment is not supported")
}

func (provider *provider) PutMeters(_ context.Context, _ string, _ []byte) error {
	return errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "putting meters is not supported")
}

func (provider *provider) PutProfile(_ context.Context, _ string, _ []byte) error {
	return errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "putting profile is not supported")
}

func (provider *provider) PutHost(_ context.Context, _ string, _ []byte) error {
	return errors.New(errors.TypeUnsupported, zeus.ErrCodeUnsupported, "putting host is not supported")
}
