package session

import (
	"context"
	"net/url"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Gets the session context for the user. The context contains information on what the user has to do in order to create a session. This also needs to be refactored and moved to a new session module.
	GetSessionContext(ctx context.Context, email string, sourceURL string) (*authtypes.SessionContext, error)

	// Create a session for a user using password authn provider.
	CreatePasswordAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, email string, password string, orgID valuer.UUID) (*authtypes.Token, error)

	// Create a session for a user using callback authn providers.
	CreateCallbackAuthNSession(ctx context.Context, authNProvider authtypes.AuthNProvider, values *url.Values) (string, error)
}
