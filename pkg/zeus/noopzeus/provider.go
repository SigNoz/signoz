package noopzeus

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/metertypes"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type Provider struct{}

func NewProviderFactory() factory.ProviderFactory[zeus.Zeus, zeus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, providerSettings factory.ProviderSettings, config zeus.Config) (zeus.Zeus, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ zeus.Config) (zeus.Zeus, error) {
	return &Provider{}, nil
}

func (provider *Provider) GetLicense(_ context.Context, _ string) (*licensetypes.License, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "this operation is not supported")
}

func (provider *Provider) GetCheckoutURL(ctx context.Context, key string) (string, error) {
	return "", errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "this operation is not supported")
}

func (provider *Provider) GetPortalURL(ctx context.Context, key string) (string, error) {
	return "", errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "this operation is not supported")
}

func (provider *Provider) GetDeployment(ctx context.Context, key string) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "this operation is not supported")
}

func (provider *Provider) PutMeters(ctx context.Context, key string, meters metertypes.Meters) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "this operation is not supported")
}
