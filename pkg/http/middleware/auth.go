package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	authCrossOrgMessage string = "::AUTH-CROSS-ORG::"
)

type Auth struct {
	jwt     *authtypes.JWT
	headers []string
	sharder sharder.Sharder
	logger  *slog.Logger
}

func NewAuth(jwt *authtypes.JWT, headers []string, sharder sharder.Sharder, logger *slog.Logger) *Auth {
	return &Auth{jwt: jwt, headers: headers, sharder: sharder, logger: logger}
}

func (a *Auth) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		for _, header := range a.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := a.jwt.ContextFromRequest(r.Context(), values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		if err := a.sharder.IsMyOwnedKey(r.Context(), types.NewOrganizationKey(valuer.MustNewUUID(claims.OrgID))); err != nil {
			a.logger.ErrorContext(r.Context(), authCrossOrgMessage, "claims", claims, "error", err)
			next.ServeHTTP(w, r)
			return
		}

		comment := ctxtypes.CommentFromContext(ctx)
		comment.Set("auth_type", "jwt")
		comment.Set("user_id", claims.UserID)
		comment.Set("org_id", claims.OrgID)

		r = r.WithContext(ctxtypes.NewContextWithComment(ctx, comment))

		next.ServeHTTP(w, r)
	})

}
