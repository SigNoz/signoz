package middleware

import (
	"net/http"
	"strings"
)

// Rewrite rewrites request URL paths that match a given prefix to a target
// prefix. This allows exposing routes under a new prefix (e.g. /v1/o11y/*)
// while keeping all internal route registrations unchanged (/api/*).
type Rewrite struct {
	from string
	to   string
}

// NewRewrite creates a middleware that rewrites paths starting with `from` to
// start with `to` instead. Both prefixes should include trailing context if
// needed (e.g. "/v1/o11y" rewrites to "/api").
func NewRewrite(from, to string) *Rewrite {
	return &Rewrite{from: from, to: to}
}

func (rw *Rewrite) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, rw.from) {
			r.URL.Path = rw.to + strings.TrimPrefix(r.URL.Path, rw.from)
			if r.URL.RawPath != "" {
				r.URL.RawPath = rw.to + strings.TrimPrefix(r.URL.RawPath, rw.from)
			}
		}
		next.ServeHTTP(w, r)
	})
}
