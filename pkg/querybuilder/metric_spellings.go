package querybuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// The span-metrics processor in signoz-otel-collector writes resource
// attributes as labels with a resource_ prefix on these metrics only. The
// signoz_latency histogram is stored as its dotted sub-metrics.
const spanMetricsResourcePrefix = "resource_"

var spanMetrics = map[string]struct{}{
	"signoz_calls_total":                 {},
	"signoz_latency":                     {},
	"signoz_latency.bucket":              {},
	"signoz_latency.sum":                 {},
	"signoz_latency.count":               {},
	"signoz_latency.min":                 {},
	"signoz_latency.max":                 {},
	"signoz_db_latency_sum":              {},
	"signoz_db_latency_count":            {},
	"signoz_external_call_latency_sum":   {},
	"signoz_external_call_latency_count": {},
}

// MetricLabelSpellings returns the family members of selector.Name, current
// first, and on a span-metrics metric each member with the resource_ prefix
// too. A name outside a family, or one the selector leaves ambiguous, is
// returned as it is.
func MetricLabelSpellings(selector telemetrytypes.FieldKeySelector) []string {
	members := semconv.Members(semconv.KindAttribute, selector)
	if len(members) <= 1 {
		return []string{selector.Name}
	}
	if selector.MetricContext == nil {
		return members
	}
	if _, ok := spanMetrics[selector.MetricContext.MetricName]; !ok {
		return members
	}
	spellings := make([]string, 0, len(members)*2)
	for _, member := range members {
		spellings = append(spellings, member, spanMetricsResourcePrefix+member)
	}
	return spellings
}

// FamilyMetricNames returns the metric-name family of metricName when the
// flag is on for the org, else the name alone.
func FamilyMetricNames(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, metricName string) []string {
	if !SemconvFamiliesEnabled(ctx, orgID, fl) {
		return []string{metricName}
	}
	return semconv.Members(semconv.KindMetric, telemetrytypes.FieldKeySelector{
		Name:         metricName,
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextMetric,
	})
}
