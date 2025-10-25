package instrumentation

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	contribsdkconfig "go.opentelemetry.io/contrib/config"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	otelprom "go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/noop"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
)

// readerWithServer wraps a metric reader with an HTTP server for proper shutdown
// This mirrors the upstream contrib/config implementation
type readerWithServer struct {
	sdkmetric.Reader
	server *http.Server
}

func (rws readerWithServer) Shutdown(ctx context.Context) error {
	return errors.Join(
		rws.Reader.Shutdown(ctx),
		rws.server.Shutdown(ctx),
	)
}

// prometheusReaderWithCustomRegistry creates a Prometheus metric reader using a custom registry
// This is based on the upstream contrib/config implementation but allows passing a custom registry
func prometheusReaderWithCustomRegistry(ctx context.Context, prometheusConfig *contribsdkconfig.Prometheus, customRegistry *prometheus.Registry) (sdkmetric.Reader, error) {
	var opts []otelprom.Option
	if prometheusConfig.Host == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "host must be specified")
	}
	if prometheusConfig.Port == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "port must be specified")
	}
	if prometheusConfig.WithoutScopeInfo != nil && *prometheusConfig.WithoutScopeInfo {
		opts = append(opts, otelprom.WithoutScopeInfo())
	}
	if prometheusConfig.WithoutTypeSuffix != nil && *prometheusConfig.WithoutTypeSuffix {
		opts = append(opts, otelprom.WithoutCounterSuffixes())
	}
	if prometheusConfig.WithoutUnits != nil && *prometheusConfig.WithoutUnits {
		opts = append(opts, otelprom.WithoutUnits())
	}
	if prometheusConfig.WithResourceConstantLabels != nil {
		if prometheusConfig.WithResourceConstantLabels.Included != nil {
			var keys []attribute.Key
			for _, val := range prometheusConfig.WithResourceConstantLabels.Included {
				keys = append(keys, attribute.Key(val))
			}
			opts = append(opts, otelprom.WithResourceAsConstantLabels(attribute.NewAllowKeysFilter(keys...)))
		}
		if prometheusConfig.WithResourceConstantLabels.Excluded != nil {
			var keys []attribute.Key
			for _, val := range prometheusConfig.WithResourceConstantLabels.Excluded {
				keys = append(keys, attribute.Key(val))
			}
			opts = append(opts, otelprom.WithResourceAsConstantLabels(attribute.NewDenyKeysFilter(keys...)))
		}
	}

	// Use custom registry instead of creating a new one
	opts = append(opts, otelprom.WithRegisterer(customRegistry))

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.HandlerFor(customRegistry, promhttp.HandlerOpts{Registry: customRegistry}))
	server := http.Server{
		// Timeouts are necessary to make a server resilient to attacks, but ListenAndServe doesn't set any.
		// We use values from this example: https://blog.cloudflare.com/exposing-go-on-the-internet/#:~:text=There%20are%20three%20main%20timeouts
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
		Handler:      mux,
	}
	addr := fmt.Sprintf("%s:%d", *prometheusConfig.Host, *prometheusConfig.Port)

	reader, err := otelprom.New(opts...)
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "error creating otel prometheus exporter: %s", err.Error())
	}
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, errors.Join(
			errors.Newf(errors.TypeInternal, errors.CodeInternal, "binding address %s for Prometheus exporter: %s", addr, err.Error()),
			reader.Shutdown(ctx),
		)
	}

	go func() {
		if err := server.Serve(lis); err != nil && !errors.Is(err, http.ErrServerClosed) {
			otel.Handle(errors.Newf(errors.TypeInternal, errors.CodeInternal, "the Prometheus HTTP server exited unexpectedly: %s", err.Error()))
		}
	}()

	return readerWithServer{reader, &server}, nil
}

type shutdownFunc func(context.Context) error

// noopShutdown is a no-op shutdown function
func noopShutdown(context.Context) error { return nil }

// meterProviderWithCustomRegistry creates a meter provider using contrib config approach
// but with custom Prometheus registry injection
func meterProviderWithCustomRegistry(ctx context.Context, meterProviderConfig *contribsdkconfig.MeterProvider, res *resource.Resource, customRegistry *prometheus.Registry) (metric.MeterProvider, shutdownFunc, error) {
	if meterProviderConfig == nil {
		return noop.NewMeterProvider(), noopShutdown, nil
	}
	opts := []sdkmetric.Option{
		sdkmetric.WithResource(res),
	}

	var errs []error
	for _, reader := range meterProviderConfig.Readers {
		r, err := metricReaderWithCustomRegistry(ctx, reader, customRegistry)
		if err == nil {
			opts = append(opts, sdkmetric.WithReader(r))
		} else {
			errs = append(errs, err)
		}
	}

	if len(errs) > 0 {
		return noop.NewMeterProvider(), noopShutdown, errors.Join(errs...)
	}

	mp := sdkmetric.NewMeterProvider(opts...)
	return mp, mp.Shutdown, nil
}

// metricReaderWithCustomRegistry creates metric readers with custom Prometheus registry support
func metricReaderWithCustomRegistry(ctx context.Context, r contribsdkconfig.MetricReader, customRegistry *prometheus.Registry) (sdkmetric.Reader, error) {
	if r.Periodic != nil && r.Pull != nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "must not specify multiple metric reader type")
	}

	if r.Pull != nil {
		return pullReaderWithCustomRegistry(ctx, r.Pull.Exporter, customRegistry)
	}
	return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no valid metric reader")
}

// pullReaderWithCustomRegistry creates pull readers with custom Prometheus registry support
func pullReaderWithCustomRegistry(ctx context.Context, exporter contribsdkconfig.MetricExporter, customRegistry *prometheus.Registry) (sdkmetric.Reader, error) {
	if exporter.Prometheus != nil {
		return prometheusReaderWithCustomRegistry(ctx, exporter.Prometheus, customRegistry)
	}

	return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no valid metric exporter")
}
