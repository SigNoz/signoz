package middleware

import (
	"net/http"

	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

type Auth struct {
	logger  *zap.Logger
	jwt     *authtypes.JWT
	headers []string
}

func NewAuth(logger *zap.Logger, jwt *authtypes.JWT, headers []string) *Auth {
	if logger == nil {
		panic("cannot build auth middleware, logger is empty")
	}

	return &Auth{logger: logger, jwt: jwt, headers: headers}
}

func (a *Auth) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		for _, header := range a.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := a.jwt.ContextFromRequest(
			r.Context(),
			values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})

}
