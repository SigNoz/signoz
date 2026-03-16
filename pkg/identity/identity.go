package identity

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

// Resolver resolves the identity of an HTTP request caller.
// Each implementation handles one authentication strategy
// (e.g., user tokens, service account API keys, trusted headers).
type Resolver interface {
	// Test checks if this resolver can handle the request.
	// This should be a cheap check (e.g., header presence) with no I/O.
	Test(ctx context.Context, r *http.Request) bool

	// Authenticate validates the credentials and returns the resolved identity.
	// Only called when Test() returns true.
	// Errors mean credentials were found but invalid (expired, revoked, etc.).
	Authenticate(ctx context.Context, r *http.Request) (authtypes.Claims, ctxtypes.AuthType, error)

	// Name returns the resolver name for logging/metrics.
	Name() string
}

// PostAuthHook is optionally implemented by resolvers that need
// post-response side-effects (e.g., updating last_observed_at).
type PostAuthHook interface {
	PostAuth(ctx context.Context, r *http.Request, claims authtypes.Claims)
}
