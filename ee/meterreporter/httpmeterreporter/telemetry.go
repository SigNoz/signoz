package httpmeterreporter

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type reporterMetrics struct {
	checkpoints metric.Int64Counter
	reports     metric.Int64Counter
	collections metric.Int64Counter
	meters      metric.Int64Counter
}

func newReporterMetrics(meter metric.Meter) (*reporterMetrics, error) {
	var errs error

	checkpoints, err := meter.Int64Counter("signoz.meterreporter.checkpoints", metric.WithDescription("Zeus meter checkpoint fetches."), metric.WithUnit("{checkpoint}"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	reports, err := meter.Int64Counter("signoz.meterreporter.reports", metric.WithDescription("Meter reports shipped to Zeus."), metric.WithUnit("{report}"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	collections, err := meter.Int64Counter("signoz.meterreporter.collections", metric.WithDescription("Per-meter collect calls."), metric.WithUnit("{collection}"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	meters, err := meter.Int64Counter("signoz.meterreporter.meters", metric.WithDescription("Meter readings shipped to Zeus."), metric.WithUnit("{meter}"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	if errs != nil {
		return nil, errs
	}

	return &reporterMetrics{
		checkpoints: checkpoints,
		reports:     reports,
		collections: collections,
		meters:      meters,
	}, nil
}
