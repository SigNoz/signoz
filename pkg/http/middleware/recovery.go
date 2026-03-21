package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
)

type Recovery struct {
	logger *slog.Logger
}

func NewRecovery(logger *slog.Logger) *Recovery {
	return &Recovery{
		logger: logger.With(slog.String("pkg", pkgname)),
	}
}

func (middleware *Recovery) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				buf := make([]byte, 4096)
				n := runtime.Stack(buf, false)

				err := errors.New(errors.TypeFatal, errors.CodeFatal, fmt.Sprint(r)).WithStacktrace(string(buf[:n]))
				middleware.logger.ErrorContext(req.Context(), "panic recovered", errors.Attr(err))

				render.Error(rw, errors.Wrap(err, errors.TypeFatal, errors.CodeFatal, "An unexpected error occurred on our end. Please try again."))
			}
		}()
		next.ServeHTTP(rw, req)
	})
}
