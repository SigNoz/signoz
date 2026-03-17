package identn

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type IdentNResolver interface {
	// GetIdentN returns the first IdentN whose Test() returns true for the request.
	// Returns nil if no resolver matched.
	GetIdentN(r *http.Request) IdentN
}

type IdentN interface {
	// Test checks if this identN can handle the request.
	// This should be a cheap check (e.g., header presence) with no I/O.
	Test(r *http.Request) bool

	// GetIdentity returns the resolved identity.
	// Only called when Test() returns true.
	GetIdentity(r *http.Request) (*authtypes.Identity, error)

	Name() authtypes.IdentNProvider

	Enabled() bool
}

// IdentNWithPreHook is optionally implemented by resolvers that need to
// enrich the request before authentication (e.g., storing the access token
// in context so downstream handlers can use it even on auth failure).
type IdentNWithPreHook interface {
	IdentN

	Pre(r *http.Request) *http.Request
}

// IdentNWithPostHook is optionally implemented by resolvers that need
// post-response side-effects (e.g., updating last_observed_at).
type IdentNWithPostHook interface {
	IdentN

	Post(ctx context.Context, r *http.Request, claims authtypes.Claims)
}
