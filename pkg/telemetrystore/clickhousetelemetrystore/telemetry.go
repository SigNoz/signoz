package clickhousetelemetrystore

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type metrics struct {
	open    metric.Int64ObservableGauge
	idle    metric.Int64ObservableGauge
	maxOpen metric.Int64ObservableGauge
	maxIdle metric.Int64ObservableGauge
}

func newMetrics(meter metric.Meter) (*metrics, error) {
	var errs error

	open, err := meter.Int64ObservableGauge("signoz.telemetrystore.connection.open", metric.WithDescription("Open is the current number of open connections to the telemetry store."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	idle, err := meter.Int64ObservableGauge("signoz.telemetrystore.connection.idle", metric.WithDescription("Idle is the current number of idle connections in the telemetry store pool."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	maxOpen, err := meter.Int64ObservableGauge("signoz.telemetrystore.connection.max_open", metric.WithDescription("MaxOpen is the configured maximum number of open connections to the telemetry store."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	maxIdle, err := meter.Int64ObservableGauge("signoz.telemetrystore.connection.max_idle", metric.WithDescription("MaxIdle is the configured maximum number of idle connections in the telemetry store pool."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	if errs != nil {
		return nil, errs
	}

	return &metrics{
		open:    open,
		idle:    idle,
		maxOpen: maxOpen,
		maxIdle: maxIdle,
	}, nil
}
