package middleware

import (
	"net/http"

	// TODO(remove): Remove auth packages

	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

type Auth struct {
	logger    *zap.Logger
	jwtSecret string
}

func NewAuth(logger *zap.Logger) *Auth {
	if logger == nil {
		panic("cannot build auth middleware, logger is empty")
	}

	return &Auth{logger: logger}
}

func (a *Auth) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jwt, err := authtypes.GetJwtFromRequest(r)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		claims, err := authtypes.GetJwtClaims(jwt, a.jwtSecret)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// validate the claims
		err = authtypes.ValidateJwtClaims(claims)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// attach the claims to the request
		ctx := authtypes.AttachClaimsToContext(r.Context(), claims)
		r = r.WithContext(ctx)

		// next handler
		next.ServeHTTP(w, r)
	})

}
