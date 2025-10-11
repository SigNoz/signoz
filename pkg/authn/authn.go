package authn

import (
	"context"
	"net/url"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// This can either be a password authn or a callback authn.
type AuthN interface{}

type PasswordAuthN interface {
	// Authenticate a user using email, password and orgID
	Authenticate(context.Context, string, string, valuer.UUID) (*authtypes.Identity, error)
}

type CallbackAuthN interface {
	// The initial URL to redirect the user to. Takes the site url and org domain to be used in the callback.
	LoginURL(context.Context, *url.URL, *authtypes.AuthDomain) (string, error)

	// Handle the callback from the provider.
	HandleCallback(context.Context, url.Values) (*authtypes.CallbackIdentity, error)
}
