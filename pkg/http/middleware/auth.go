package middleware

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type Auth struct {
	jwt     *authtypes.JWT
	headers []string
}

func NewAuth(jwt *authtypes.JWT, headers []string) *Auth {
	return &Auth{jwt: jwt, headers: headers}
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

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})

}
