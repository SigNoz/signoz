package opaquetokenizer

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	config   tokenizer.Config
	settings factory.ProviderSettings
}

func NewProviderFactory() factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config] {
	return factory.NewProviderFactory(factory.MustNewName("opaquetokenizer"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config tokenizer.Config) (tokenizer.Tokenizer, error) {
	return &provider{
		config:   config,
		settings: providerSettings,
	}, nil
}

func (provider *provider) Start(context.Context) error {
	panic("unimplemented")
}

func (provider *provider) CreateToken(context.Context, *authtypes.AuthenticatedUser) (*authtypes.Token, error) {
	panic("unimplemented")
}

func (provider *provider) DeleteToken(context.Context, *authtypes.Token) error {
	panic("unimplemented")
}

func (pprovider *provider) GetAuthenticatedUser(context.Context, *authtypes.Token) (*authtypes.AuthenticatedUser, error) {
	panic("unimplemented")
}

func (provider *provider) ListTokens(context.Context, *authtypes.Token) ([]*authtypes.Token, error) {
	panic("unimplemented")
}

func (provider *provider) RotateToken(context.Context, *authtypes.Token) (*authtypes.Token, error) {
	panic("unimplemented")
}

func (provider *provider) Stop(context.Context) error {
	panic("unimplemented")
}

func (provider *provider) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	panic("unimplemented")
}
