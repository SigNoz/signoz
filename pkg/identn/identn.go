package identn

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type IdentNResolver interface {
	// GetIdentity tries identNs in order and returns the resolved identity.
	GetIdentity(r *http.Request) (*authtypes.Identity, IdentN, error)
}

type IdentN interface {
	// Test checks if this identn can handle the request. This should be a cheap check (e.g., header presence) with no I/O.
	Test(r *http.Request) bool

	// GetIdentity returns the resolved identity. Only called when Test() returns true.
	GetIdentity(r *http.Request) (*authtypes.Identity, error)

	Name() authtypes.IdentNProvider
}

type IdentNWithPostHook interface {
	IdentN

	Post(ctx context.Context, r *http.Request, claims authtypes.Claims)
}
