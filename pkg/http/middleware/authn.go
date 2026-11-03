package middleware

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

const (
	authnDeniedMessage string = "::AUTHN-DENIED::"
)

type AuthN struct {
	logger *slog.Logger
}

func NewAuthN(logger *slog.Logger) *AuthN {
	if logger == nil {
		panic("cannot build authn middleware, logger is empty")
	}

	return &AuthN{logger: logger.With(slog.String("pkg", pkgname))}
}

func (middleware *AuthN) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		if allowsAnonymous(req) {
			next.ServeHTTP(rw, req)
			return
		}

		if _, err := authtypes.ClaimsFromContext(req.Context()); err != nil {
			middleware.logger.WarnContext(req.Context(), authnDeniedMessage, slog.String("path", req.URL.Path), slog.String("method", req.Method))
			render.Error(rw, err)
			return
		}

		next.ServeHTTP(rw, req)
	})
}

func allowsAnonymous(req *http.Request) bool {
	route := mux.CurrentRoute(req)
	if route == nil {
		return false
	}

	registered, ok := route.GetHandler().(handler.Handler)
	if !ok {
		return true
	}

	return registered.AllowsAnonymous()
}
