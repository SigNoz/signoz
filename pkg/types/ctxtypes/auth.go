package ctxtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type AuthType struct {
	valuer.String
}

var (
	AuthTypeTokenizer = AuthType{valuer.NewString("tokenizer")}
	AuthTypeAPIKey    = AuthType{valuer.NewString("api_key")}
	AuthTypeInternal  = AuthType{valuer.NewString("internal")}
)

type authTypeKey struct{}

// SetAuthType stores the auth type (e.g., AuthTypeJWT, AuthTypeAPIKey, AuthTypeInternal) in context.
func SetAuthType(ctx context.Context, authType AuthType) context.Context {
	return context.WithValue(ctx, authTypeKey{}, authType)
}

// AuthTypeFromContext retrieves the auth type from context if set.
func AuthTypeFromContext(ctx context.Context) (AuthType, bool) {
	v, ok := ctx.Value(authTypeKey{}).(AuthType)
	return v, ok
}
