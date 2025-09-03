package ctxtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AuthTypeJWT      = valuer.NewString("jwt")
	AuthTypeAPIKey   = valuer.NewString("api_key")
	AuthTypeInternal = valuer.NewString("internal")
)

type authCtxKey struct{}
type Auth struct {
	Type     valuer.String
	UserID   valuer.UUID
	APIKeyID valuer.UUID
	OrgID    valuer.UUID
}

// SetAuthType stores the auth type (e.g., AuthTypeJWT, AuthTypeAPIKey, AuthTypeInternal) in context.
func SetAuth(ctx context.Context, auth Auth) context.Context {
	return context.WithValue(ctx, authCtxKey{}, auth)
}

// AuthTypeFromContext retrieves the auth type from context if set.
func AuthFromContext(ctx context.Context) (Auth, bool) {
	v, ok := ctx.Value(authCtxKey{}).(Auth)
	return v, ok
}
