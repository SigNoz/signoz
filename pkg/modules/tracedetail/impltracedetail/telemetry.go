package impltracedetail

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type moduleMetrics struct {
	waterfallMaxLimitToSelectAllSpans metric.Int64Gauge
	waterfallWindowedResponseCount    metric.Int64Counter
}

func newModuleMetrics(meter metric.Meter) (*moduleMetrics, error) {
	var errs error

	maxLimitGauge, err := meter.Int64Gauge(
		"signoz.tracedetail.waterfall.max_limit_to_select_all_spans",
		metric.WithDescription("The span count limit above which windowed waterfall is returned instead of the full waterfall."),
		metric.WithUnit("{spans}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	windowedCounter, err := meter.Int64Counter(
		"signoz.tracedetail.waterfall.windowed_responses",
		metric.WithDescription("Total number of waterfall requests that used the windowed path."),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	return &moduleMetrics{
		waterfallMaxLimitToSelectAllSpans: maxLimitGauge,
		waterfallWindowedResponseCount:    windowedCounter,
	}, errs
}
