package noopgateway

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
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

func (p *provider) GetIngestionKeys(ctx context.Context, orgID valuer.UUID, page, perPage int) ([]byte, error) {
	return nil, errors.New(errors.TypeUnsupported, gateway.ErrCodeGatewayUnsupported, "unsupported call")
}
