package middleware

import "net/http"

const (
	pkgname string = "go.signoz.io/pkg/http/middleware"
)

// Wrapper is an interface implemented by all middlewares
type Wrapper interface {
	Wrap(http.Handler) http.Handler
}

// WrapperFunc is to Wrapper as http.HandlerFunc is to http.Handler
type WrapperFunc func(http.Handler) http.Handler

// WrapperFunc implements Wrapper
func (m WrapperFunc) Wrap(next http.Handler) http.Handler {
	return m(next)
}
