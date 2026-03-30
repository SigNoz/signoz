package auditorserver

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type serverMetrics struct {
	eventsEmitted metric.Int64Counter
	writeErrors   metric.Int64Counter
	eventsDropped metric.Int64Counter
	bufferSize    metric.Int64ObservableGauge
}

func newServerMetrics(meter metric.Meter) (*serverMetrics, error) {
	var errs error

	eventsEmitted, err := meter.Int64Counter("signoz.audit.events.emitted", metric.WithDescription("Total number of audit events emitted for export."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	writeErrors, err := meter.Int64Counter("signoz.audit.store.write_errors", metric.WithDescription("Total number of audit store write errors during export."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	eventsDropped, err := meter.Int64Counter("signoz.audit.events.dropped", metric.WithDescription("Total number of audit events dropped due to a full buffer."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	bufferSize, err := meter.Int64ObservableGauge("signoz.audit.events.buffer_size", metric.WithDescription("Current number of audit events buffered for export."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	if errs != nil {
		return nil, errs
	}

	return &serverMetrics{
		eventsEmitted: eventsEmitted,
		writeErrors:   writeErrors,
		eventsDropped: eventsDropped,
		bufferSize:    bufferSize,
	}, nil
}
