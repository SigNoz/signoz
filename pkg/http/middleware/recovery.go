package middleware

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"runtime"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

const (
	recoveryMessage string = "::PANIC-RECOVERED::"
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
		// Capture the request body before the handler consumes it.
		var requestBody []byte
		if req.Body != nil {
			if body, err := io.ReadAll(req.Body); err == nil {
				requestBody = body
			}
			req.Body = io.NopCloser(bytes.NewReader(requestBody))
		}

		defer func() {
			if r := recover(); r != nil {
				buf := make([]byte, 4096)
				n := runtime.Stack(buf, false)

				err := errors.New(errors.TypeFatal, errors.CodeFatal, fmt.Sprint(r)).WithStacktrace(string(buf[:n]))

				attrs := []any{
					errors.Attr(err),
					string(semconv.HTTPRequestMethodKey), req.Method,
					string(semconv.HTTPRouteKey), req.URL.Path,
				}
				if len(requestBody) > 0 {
					attrs = append(attrs, "request.body", string(requestBody))
				}
				middleware.logger.ErrorContext(req.Context(), recoveryMessage, attrs...)

				render.Error(rw, errors.Wrap(err, errors.TypeFatal, errors.CodeFatal, "An unexpected error occurred. Please retry, and if the issue persists, report it at https://github.com/SigNoz/signoz/issues or contact support."))
			}
		}()
		next.ServeHTTP(rw, req)
	})
}
