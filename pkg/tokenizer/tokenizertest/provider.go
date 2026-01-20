package tokenizertest

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ tokenizer.Tokenizer = (*Provider)(nil)

type Provider struct {
	stopC chan struct{}
}

func New() *Provider {
	return &Provider{stopC: make(chan struct{})}
}

// Collect implements tokenizer.Tokenizer.
func (provider *Provider) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	panic("unimplemented")
}

// CreateToken implements tokenizer.Tokenizer.
func (provider *Provider) CreateToken(context.Context, *authtypes.Identity, map[string]string) (*authtypes.Token, error) {
	panic("unimplemented")
}

// DeleteToken implements tokenizer.Tokenizer.
func (provider *Provider) DeleteToken(context.Context, string) error {
	panic("unimplemented")
}

// GetIdentity implements tokenizer.Tokenizer.
func (provider *Provider) GetIdentity(context.Context, string) (*authtypes.Identity, error) {
	panic("unimplemented")
}

// RotateToken implements tokenizer.Tokenizer.
func (provider *Provider) RotateToken(context.Context, string, string) (*authtypes.Token, error) {
	panic("unimplemented")
}

// Start implements tokenizer.Tokenizer.
func (provider *Provider) Start(context.Context) error {
	panic("unimplemented")
}

// Stop implements tokenizer.Tokenizer.
func (provider *Provider) Stop(context.Context) error {
	close(provider.stopC)
	return nil
}

func (provider *Provider) DeleteIdentity(context.Context, valuer.UUID) error {
	panic("unimplemented")
}

func (provider *Provider) DeleteTokensByUserID(context.Context, valuer.UUID) error {
	panic("unimplemented")
}

func (provider *Provider) Config() tokenizer.Config {
	panic("unimplemented")
}

func (provider *Provider) SetLastObservedAt(context.Context, string, time.Time) error {
	panic("unimplemented")
}

func (provider *Provider) ListMaxLastObservedAtByOrgID(context.Context, valuer.UUID) (map[valuer.UUID]time.Time, error) {
	panic("unimplemented")
}
