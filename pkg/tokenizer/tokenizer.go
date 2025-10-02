package tokenizer

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Tokenizer interface {
	factory.Service
	// Create a new token.
	CreateToken(context.Context, *authtypes.Identity, map[string]string) (*authtypes.Token, error)

	// Get identity from token.
	GetIdentity(context.Context, string) (*authtypes.Identity, error)

	// Rotate the input token and return a new token.
	RotateToken(context.Context, string, string) (*authtypes.Token, error)

	// Delete the token by access token.
	DeleteToken(context.Context, string) error

	// Delete all tokens by userID.
	DeleteTokensByUserID(context.Context, valuer.UUID) error

	// Delete the identity by userID.
	DeleteIdentity(context.Context, valuer.UUID) error

	// Returns the config of the tokenizer.
	Config() Config

	statsreporter.StatsCollector
}
