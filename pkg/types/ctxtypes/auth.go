package ctxtypes

import "context"

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
