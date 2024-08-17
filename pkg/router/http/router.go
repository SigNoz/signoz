package http

import (
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.25.0"
	"go.signoz.io/signoz/pkg/log"
)

type Router struct {
	r   *mux.Router
	sub *mux.Router
}

func NewRouter(logger log.Logger) *Router {
	router := mux.NewRouter()
	sub := router.PathPrefix("/").Subrouter().UseEncodedPath()

	sub.Use(
		logRequest(logger),
	)

	return &Router{
		r:   router,
		sub: sub,
	}
}

func (router *Router) Handler() http.Handler {
	return router.r
}

func (router *Router) Mux() *mux.Router {
	return router.r
}

func (router *Router) Sub() *mux.Router {
	return router.sub
}

func logRequest(logger log.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			ctx := req.Context()
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
