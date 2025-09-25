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
	CreateToken(context.Context, *authtypes.AuthenticatedUser, map[string]string) (*authtypes.Token, error)

	// Get user from token.
	GetAuthenticatedUser(context.Context, string) (*authtypes.AuthenticatedUser, error)

	// Rotate the input token and return a new token.
	RotateToken(context.Context, string) (*authtypes.Token, error)

	// Delete the token.
	DeleteToken(context.Context, string) error

	statsreporter.StatsCollector
}
