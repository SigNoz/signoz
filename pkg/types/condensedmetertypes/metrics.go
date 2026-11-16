package condensedmetertypes

import (
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

const (
	metricNameMetricsDataPointsCount = "signoz.meter.metric.datapoint.count"
	metricDescMetricsDataPointsCount = "The number of data points indexed."
)

// Row is the number of condensed rows of one dimension set in one hour.
// Values are positional, in the order of the configured dimensions; an empty value means the dimension is absent.
type Row struct {
	Values []string
	Count  uint64
}

// NewPMetrics shapes rows like the meter connector's output (dimensions as data point attributes, delta monotonic sum), so they land in the same meter table and slice the same way.
func NewPMetrics(rows []Row, dimensions []string, timestamp time.Time, scopeName string, scopeVersion string) pmetric.Metrics {
	metrics := pmetric.NewMetrics()
	scopeMetrics := metrics.ResourceMetrics().AppendEmpty().ScopeMetrics().AppendEmpty()
	scopeMetrics.Scope().SetName(scopeName)
	scopeMetrics.Scope().SetVersion(scopeVersion)

	metric := scopeMetrics.Metrics().AppendEmpty()
	metric.SetName(metricNameMetricsDataPointsCount)
	metric.SetDescription(metricDescMetricsDataPointsCount)
	metric.SetUnit("1")
	sum := metric.SetEmptySum()
	sum.SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
	sum.SetIsMonotonic(true)

	for _, row := range rows {
		dataPoint := sum.DataPoints().AppendEmpty()
		dataPoint.SetTimestamp(pcommon.NewTimestampFromTime(timestamp))
		dataPoint.SetIntValue(int64(row.Count))
		for i, dimension := range dimensions {
			if row.Values[i] != "" {
				dataPoint.Attributes().PutStr(dimension, row.Values[i])
			}
		}
	}

	return metrics
}
