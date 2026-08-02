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
		// Capture up to 4 KiB of the request body before the handler
		// consumes it. The cap keeps memory bounded and the redaction
		// below prevents credentials from being written to the log when
		// a panic happens.
		var requestBody []byte
		if req.Body != nil {
			if body, err := io.ReadAll(io.LimitReader(req.Body, 4096)); err == nil {
				requestBody = body
				req.Body = io.NopCloser(io.MultiReader(bytes.NewReader(body), req.Body))
			} else {
				req.Body = io.NopCloser(bytes.NewReader(nil))
			}
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
					attrs = append(attrs, "request.body", redactCredentials(requestBody))
				}
				middleware.logger.ErrorContext(req.Context(), recoveryMessage, attrs...)

				render.Error(rw, errors.Wrap(err, errors.TypeFatal, errors.CodeFatal, "An unexpected error occurred. Please retry, and if the issue persists, report it at https://github.com/SigNoz/signoz/issues or contact support."))
			}
		}()
		next.ServeHTTP(rw, req)
	})
}

// redactCredentials replaces the value of common credential-bearing JSON
// keys with "[REDACTED]" so they are not written to logs when a panic
// happens. This is intentionally minimal — handlers must not depend on
// the body being safe to log; this is a defence-in-depth measure for the
// recovery middleware only.
func redactCredentials(body []byte) string {
	s := string(body)
	for _, k := range []string{"password", "oldPassword", "newPassword", "refreshToken", "accessToken", "token", "apiKey", "api_key"} {
		s = redactJSONField(s, k)
	}
	return s
}

func redactJSONField(s, key string) string {
	quoted := `"` + key + `"`
	idx := 0
	for {
		at := indexOf(s, quoted, idx)
		if at < 0 {
			return s
		}
		colon := indexOf(s, ":", at+len(quoted))
		if colon < 0 {
			return s
		}
		start := colon + 1
		for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
			start++
		}
		end := start
		if end < len(s) && s[end] == '"' {
			end++
			for end < len(s) && s[end] != '"' {
				end++
			}
			end++
		} else {
			for end < len(s) && s[end] != ',' && s[end] != '}' && s[end] != '\n' {
				end++
			}
		}
		s = s[:start] + `"[REDACTED]"` + s[end:]
		idx = start + len(`"[REDACTED]"`)
	}
}

func indexOf(s, sub string, from int) int {
	if from >= len(s) {
		return -1
	}
	for i := from; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
