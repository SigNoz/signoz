package middleware

import (
	"context"
	"net/http"

	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

type Auth struct {
	logger *zap.Logger
	jwt    *authtypes.JWT
}

func NewAuth(logger *zap.Logger, jwt *authtypes.JWT) *Auth {
	if logger == nil {
		panic("cannot build auth middleware, logger is empty")
	}

	return &Auth{logger: logger, jwt: jwt}
}

func (a *Auth) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// if there is a PAT token, attach it to context
		patToken := r.Header.Get("SIGNOZ-API-KEY")
		if patToken != "" {
			ctx := context.WithValue(r.Context(), authtypes.PatTokenKey, patToken)
			r = r.WithContext(ctx)
		}

		// jwt parsing
		jwt, err := a.jwt.GetJwtFromRequest(r)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		claims, err := a.jwt.Claims(jwt)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// attach the claims to the request
		ctx := a.jwt.NewContextWithClaims(r.Context(), claims)
		r = r.WithContext(ctx)

		// next handler
		next.ServeHTTP(w, r)
	})

}
