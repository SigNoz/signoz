package middleware

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

// NoAuth is a middleware that bypasses authentication and sets a default internal context
type NoAuth struct{}

// NewNoAuth creates a new NoAuth middleware
func NewNoAuth() *NoAuth {
	return &NoAuth{}
}

// Wrap implements the Wrapper interface, providing a default internal authentication context
func (n *NoAuth) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a default internal claims context when auth is disabled
		// Use well-known UUIDs that should exist in a properly setup SigNoz instance
		claims := authtypes.Claims{
			UserID: "00000000-0000-0000-0000-000000000001", // Default admin user ID
			Role:   types.RoleAdmin,                        // Give admin role to bypass authorization checks
			Email:  "admin@signoz.internal",
			OrgID:  "00000000-0000-0000-0000-000000000001", // Default organization ID
		}

		ctx := authtypes.NewContextWithClaims(r.Context(), claims)
		ctx = ctxtypes.SetAuthType(ctx, ctxtypes.AuthTypeInternal)

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", ctxtypes.AuthTypeInternal.StringValue())
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)
		comment.Set("auth_disabled", "true")
		r = r.WithContext(ctxtypes.NewContextWithComment(ctx, comment))

		next.ServeHTTP(w, r)
	})
}
