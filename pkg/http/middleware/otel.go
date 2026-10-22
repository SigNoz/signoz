package middleware

import (
	"net/http"
	"slices"

	"github.com/gorilla/mux"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

// defaultExcludedRoutes are the health endpoints kept out of tracing/metrics to
// avoid drowning telemetry in probe traffic.
var defaultExcludedRoutes = []string{
	"/api/v1/health",
	"/api/v2/healthz",
	"/api/v2/readyz",
	"/api/v2/livez",
}

type Otel struct {
	wrap mux.MiddlewareFunc
}

func NewOtel(service string, meterProvider metric.MeterProvider, tracerProvider trace.TracerProvider) *Otel {
	return &Otel{
		wrap: otelmux.Middleware(
			service,
			otelmux.WithMeterProvider(meterProvider),
			otelmux.WithTracerProvider(tracerProvider),
			otelmux.WithPropagators(propagation.NewCompositeTextMapPropagator(propagation.Baggage{}, propagation.TraceContext{})),
			otelmux.WithFilter(func(r *http.Request) bool {
				return !slices.Contains(defaultExcludedRoutes, r.URL.Path)
			}),
		),
	}
}

func (middleware *Otel) Wrap(next http.Handler) http.Handler {
	return middleware.wrap(next)
}
