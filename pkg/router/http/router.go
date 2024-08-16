package http

import (
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.25.0"
	"go.signoz.io/signoz/pkg/log"
)

type Handler struct {
	router *mux.Router
}

func NewHandler(logger log.Logger) *Handler {
	router := mux.NewRouter().UseEncodedPath()

	router.Use(
		logRequest(logger),
	)

	return &Handler{
		router: mux.NewRouter().UseEncodedPath(),
	}
}

func logRequest(logger log.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			ctx := req.Context()
			start := time.Now()
			host, port, _ := net.SplitHostPort(req.Host)
			path, _ := mux.CurrentRoute(req).GetPathTemplate()

			fields := []any{
				string(semconv.ClientAddressKey), req.RemoteAddr,
				string(semconv.UserAgentOriginalKey), req.UserAgent(),
				string(semconv.ServerAddressKey), host,
				string(semconv.ServerPortKey), port,
				string(semconv.HTTPRequestSizeKey), req.ContentLength,
				string(semconv.HTTPRouteKey), path,
			}

			writer := NewWriter(rw)
			next.ServeHTTP(writer, req)

			fields = append(fields,
				string(semconv.HTTPServerRequestDurationName), time.Since(start),
				string(semconv.HTTPResponseStatusCodeKey), writer.statusCode,
			)
			logger.Infoctx(ctx, "::RECEIVED-REQUEST::", fields...)
		})
	}

}
