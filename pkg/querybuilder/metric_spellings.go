package querybuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// The span-metrics processor in signoz-otel-collector flattens resource
// attributes into labels with a resource_ prefix. Only the metrics it emits
// carry that layout. The histogram signoz_latency is stored as the
// sub-metrics the metrics exporter derives from it, with a dot before the
// suffix. The other names are emitted as they are.
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

// MetricLabelSpellings returns the storage spellings that can hold
// selector.Name in metric labels: the family members, current first, and
// for a span-metrics metric each member with the resource_ prefix too. The
// requested name is never rewritten. A name outside an enabled family is
// returned unchanged, and so is a name the selector leaves ambiguous.
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

// FamilyMetricNames returns the storage names a metric query must read: the
// requested name plus the other names of its metric-name family when the
// resolve_semconv_families flag is on for the org.
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
