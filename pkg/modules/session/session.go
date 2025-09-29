package session

import (
	"context"
	"net/http"
	"net/url"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Gets the session context for the user. The context contains information on what the user has to do in order to create a session. This also needs to be refactored and moved to a new session module.
	GetSessionContext(ctx context.Context, email valuer.Email, siteURL *url.URL) (*authtypes.SessionContext, error)

	// Create a session for a user using password authn provider.
	CreatePasswordAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, email valuer.Email, password string, orgID valuer.UUID) (*authtypes.Token, error)

	// Create a session for a user using callback authn providers.
	CreateCallbackAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, values url.Values) (string, error)

	// Rotate a token.
	RotateSession(ctx context.Context, accessToken string, refreshToken string) (*authtypes.Token, error)

	// Delete a session.
	DeleteSession(ctx context.Context, accessToken string) error
}

type Handler interface {
	// Get the session context for the user.
	GetSessionContext(http.ResponseWriter, *http.Request)

	// Create a session for a user using email and password.
	CreateSessionByEmailPassword(http.ResponseWriter, *http.Request)

	// Create a session for a user using google callback.
	CreateSessionByGoogleCallback(http.ResponseWriter, *http.Request)

	// Create a session for a user using saml callback.
	CreateSessionBySAMLCallback(http.ResponseWriter, *http.Request)

	// Rotate a token.
	RotateSession(http.ResponseWriter, *http.Request)

	// Delete a session.
	DeleteSession(http.ResponseWriter, *http.Request)
}
