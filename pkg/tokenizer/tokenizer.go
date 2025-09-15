package tokenizer

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type Tokenizer interface {
	factory.Service
	// Create a new token.
	CreateToken(context.Context, *authtypes.AuthenticatedUser) (*authtypes.Token, error)

	// Get user from token.
	GetAuthenticatedUser(context.Context, *authtypes.Token) (*authtypes.AuthenticatedUser, error)

	// Rotate the input token and return a new token.
	RotateToken(context.Context, *authtypes.Token) (*authtypes.Token, error)

	// Delete the token.
	DeleteToken(context.Context, *authtypes.Token) error

	// List all tokens related to the input token.
	ListTokens(context.Context, *authtypes.Token) ([]*authtypes.Token, error)

	statsreporter.StatsCollector
}
