package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	identityCrossOrgMessage string = "::IDENTITY-CROSS-ORG::"
)

type IdentN struct {
	resolver identn.IdentNResolver
	sharder  sharder.Sharder
	headers  []string
	logger   *slog.Logger
}

func NewIdentN(resolver identn.IdentNResolver, sharder sharder.Sharder, headers []string, logger *slog.Logger) *IdentN {
	return &IdentN{
		resolver: resolver,
		sharder:  sharder,
		headers:  headers,
		logger:   logger,
	}
}

func (m *IdentN) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		identity, identN, err := m.resolver.GetIdentity(r)
		if err != nil {
			// Credentials found but invalid (expired, revoked, needs rotation, etc.).
			// Store the access token in context so downstream handlers like
			// RotateSession can read it regardless of the specific error.
			accessToken := extractBearerToken(r, m.headers)
			if accessToken != "" {
				ctx = authtypes.NewContextWithAccessToken(ctx, accessToken)
				r = r.WithContext(ctx)
			}
			next.ServeHTTP(w, r)
			return
		}

		if identN == nil {
			// No resolver matched — unauthenticated request.
			next.ServeHTTP(w, r)
			return
		}

		// Validate org ownership via sharder
		claims := identity.ToClaims()
		if err := m.sharder.IsMyOwnedKey(ctx, types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			m.logger.ErrorContext(ctx, identityCrossOrgMessage, "claims", claims, "error", err)
			next.ServeHTTP(w, r)
			return
		}

		// Set context values
		ctx = authtypes.NewContextWithClaims(ctx, claims)
		ctx = authtypes.SetAuthType(ctx, identN.AuthType())

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", identN.AuthType().StringValue())
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)
		ctx = ctxtypes.NewContextWithComment(ctx, comment)

		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)

		// Post-auth hook (e.g., update last_observed_at)
		if hook, ok := identN.(identn.IdentNWithPostHook); ok {
			hook.Post(context.WithoutCancel(r.Context()), r, claims)
		}
	})
}

// extractBearerToken extracts the bearer token from the configured headers.
func extractBearerToken(r *http.Request, headers []string) string {
	for _, header := range headers {
		if v := r.Header.Get(header); v != "" {
			const prefix = "Bearer "
			if len(v) >= len(prefix) && strings.EqualFold(v[:len(prefix)], prefix) {
				return v[len(prefix):]
			}
			return v
		}
	}
	return ""
}
