package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
)

// Recovery is a middleware that recovers from panics, logs the panic,
// and returns a 500 Internal Server Error.
type Recovery struct {
	logger *slog.Logger
}

// NewRecovery creates a new Recovery middleware.
func NewRecovery(logger *slog.Logger) Wrapper {
	return &Recovery{
		logger: logger.With("pkg", "http-middleware-recovery"),
	}
}

// Wrap is the middleware handler.
func (m *Recovery) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				m.logger.Error(
					"panic recovered",
					"err", err, "stack", string(debug.Stack()),
				)

				render.Error(w, errors.NewInternalf(
					errors.CodeInternal, "internal server error",
				))
			}
		}()

		next.ServeHTTP(w, r)
	})
}
