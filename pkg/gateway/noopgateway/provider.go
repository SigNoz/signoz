package noopgateway

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct{}

func NewProviderFactory() factory.ProviderFactory[gateway.Gateway, gateway.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(ctx context.Context, ps factory.ProviderSettings, c gateway.Config) (gateway.Gateway, error) {
		return New(ctx, ps, c)
	})
}

func New(_ context.Context, _ factory.ProviderSettings, _ gateway.Config) (gateway.Gateway, error) {
	return &provider{}, nil
}

func (p *provider) GetIngestionKeys(_ context.Context, _ valuer.UUID, _, _ int) (*gatewaytypes.GettableIngestionKeys, error) {
	return nil, errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) SearchIngestionKeysByName(_ context.Context, _ valuer.UUID, _ string, _, _ int) (*gatewaytypes.GettableIngestionKeys, error) {
	return nil, errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) CreateIngestionKey(_ context.Context, _ valuer.UUID, _ string, _ []string, _ time.Time) (*gatewaytypes.GettableCreatedIngestionKey, error) {
	return nil, errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) UpdateIngestionKey(_ context.Context, _ valuer.UUID, _ string, _ string, _ []string, _ time.Time) error {
	return errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) DeleteIngestionKey(_ context.Context, _ valuer.UUID, _ string) error {
	return errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) CreateIngestionKeyLimit(_ context.Context, _ valuer.UUID, _ string, _ string, _ gatewaytypes.LimitConfig, _ []string) (*gatewaytypes.GettableCreatedIngestionKeyLimit, error) {
	return nil, errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) UpdateIngestionKeyLimit(_ context.Context, _ valuer.UUID, _ string, _ gatewaytypes.LimitConfig, _ []string) error {
	return errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}

func (p *provider) DeleteIngestionKeyLimit(_ context.Context, _ valuer.UUID, _ string) error {
	return errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}
