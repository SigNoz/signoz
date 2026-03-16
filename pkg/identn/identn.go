package identn

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

// Identity authenticates an HTTP request by trying registered resolvers.
type IdentNResolver interface {
	// Authenticate tries resolvers in order and returns the resolved identity.
	GetIdentity(r *http.Request) (authtypes.Claims, authtypes.AuthType, IdentN, error)
}

// Resolver resolves the identity of an HTTP request caller.
// Each implementation handles one authentication strategy
// (e.g., user tokens, service account API keys, trusted headers).
type IdentN interface {
	// Test checks if this resolver can handle the request.
	// This should be a cheap check (e.g., header presence) with no I/O.
	Test(r *http.Request) bool

	// Authenticate validates the credentials and returns the resolved identity.
	// Only called when Test() returns true.
	// Errors mean credentials were found but invalid (expired, revoked, etc.).
	GetIdentity(r *http.Request) (authtypes.Claims, authtypes.AuthType, error)

	// Name returns the resolver name for logging/metrics.
	Name() string
}

// PostHook is implemented by idnetns that need
// post-response side-effects (e.g., updating last_observed_at).
type IdentNWithPostHook interface {
	IdentN

	Post(ctx context.Context, r *http.Request, claims authtypes.Claims)
}
