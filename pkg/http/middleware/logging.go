package middleware

import (
	"bytes"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

const (
	logMessage string = "::RECEIVED-REQUEST::"
)

type Logging struct {
	logger         *slog.Logger
	excludedRoutes map[string]struct{}
}

func NewLogging(logger *slog.Logger, excludedRoutes []string) *Logging {
	excludedRoutesMap := make(map[string]struct{})
	for _, route := range excludedRoutes {
		excludedRoutesMap[route] = struct{}{}
	}

	return &Logging{
		logger:         logger.With("pkg", pkgname),
		excludedRoutes: excludedRoutesMap,
	}
}

func (middleware *Logging) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		start := time.Now()
		host, port, _ := net.SplitHostPort(req.Host)
		path, err := mux.CurrentRoute(req).GetPathTemplate()
		if err != nil {
			path = req.URL.Path
		}

		fields := []any{
			string(semconv.ClientAddressKey), req.RemoteAddr,
			string(semconv.UserAgentOriginalKey), req.UserAgent(),
			string(semconv.ServerAddressKey), host,
			string(semconv.ServerPortKey), port,
			string(semconv.HTTPRequestSizeKey), req.ContentLength,
			string(semconv.HTTPRouteKey), path,
		}

		badResponseBuffer := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(rw, badResponseBuffer)
		next.ServeHTTP(writer, req)

		// if the path is in the excludedRoutes map, don't log
		if _, ok := middleware.excludedRoutes[path]; ok {
			return
		}

		statusCode, err := writer.StatusCode(), writer.WriteError()
		fields = append(fields,
			string(semconv.HTTPResponseStatusCodeKey), statusCode,
			string(semconv.HTTPServerRequestDurationName), time.Since(start),
		)
		if err != nil {
			fields = append(fields, "error", err)
			middleware.logger.ErrorContext(req.Context(), logMessage, fields...)
		} else {
			// when the status code is 400 or >=500, and the response body is not empty.
			if badResponseBuffer.Len() != 0 {
				fields = append(fields, "response.body", badResponseBuffer.String())
			}

			middleware.logger.InfoContext(req.Context(), logMessage, fields...)
		}
	})
}
