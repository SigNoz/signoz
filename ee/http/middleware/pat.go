package middleware

import (
	"net/http"

	"go.signoz.io/signoz/pkg/types/authtypes"
)

type Pat struct {
	uuid    *authtypes.UUID
	headers []string
}

func NewPat(headers []string) *Pat {
	return &Pat{uuid: authtypes.NewUUID(), headers: headers}
}

func (p *Pat) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var values []string
		for _, header := range p.headers {
			values = append(values, r.Header.Get(header))
		}

		ctx, err := p.uuid.ContextFromRequest(r.Context(), values...)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})

}
