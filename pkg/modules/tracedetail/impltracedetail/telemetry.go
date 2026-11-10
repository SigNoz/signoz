package impltracedetail

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

const (
	attrResponseType         = attribute.Key("response_type")
	attrResponseTypeWindowed = "windowed"
	attrResponseTypeSampled  = "sampled"
)

type moduleMetrics struct {
	waterfallSpanLimit    metric.Int64Gauge
	waterfallRequestCount metric.Int64Counter
	waterfallSpanCount    metric.Int64Counter

	flamegraphSpanLimit    metric.Int64Gauge
	flamegraphRequestCount metric.Int64Counter
}

func newModuleMetrics(meter metric.Meter) (*moduleMetrics, error) {
	var errs error

	spanLimit, err := meter.Int64Gauge(
		"signoz.traces.waterfall.span.limit",
		metric.WithDescription("The span count limit above which windowed waterfall is returned instead of the full waterfall."),
		metric.WithUnit("{span}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	requestCount, err := meter.Int64Counter(
		"signoz.traces.waterfall.request.count",
		metric.WithDescription("Total number of waterfall requests, by response_type."),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	spanCount, err := meter.Int64Counter(
		"signoz.traces.waterfall.span.count",
		metric.WithDescription("Total number of spans across waterfall requests, by response_type."),
		metric.WithUnit("{span}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	flamegraphSpanLimit, err := meter.Int64Gauge(
		"signoz.traces.flamegraph.span.limit",
		metric.WithDescription("The span count limit above which sampled flamegraph is returned instead of the full flamegraph."),
		metric.WithUnit("{span}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	flamegraphRequestCount, err := meter.Int64Counter(
		"signoz.traces.flamegraph.request.count",
		metric.WithDescription("Total number of flamegraph requests, by response_type."),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		errs = errors.Join(errs, err)
	}

	return &moduleMetrics{
		waterfallSpanLimit:    spanLimit,
		waterfallRequestCount: requestCount,
		waterfallSpanCount:    spanCount,

		flamegraphSpanLimit:    flamegraphSpanLimit,
		flamegraphRequestCount: flamegraphRequestCount,
	}, errs
}
