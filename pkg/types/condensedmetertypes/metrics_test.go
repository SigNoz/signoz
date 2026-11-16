package condensedmetertypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

func TestNewPMetrics(t *testing.T) {
	timestamp := time.Date(2026, 11, 12, 13, 5, 0, 0, time.UTC)
	dimensions := []string{"service.name", "host.name"}
	rows := []Row{
		{Values: []string{"frontend", "host-1"}, Count: 31},
		{Values: []string{"checkout", ""}, Count: 4},
	}

	metrics := NewPMetrics(rows, dimensions, timestamp, "signoz", "v0.0.1")

	require.Equal(t, 1, metrics.ResourceMetrics().Len())
	resourceMetrics := metrics.ResourceMetrics().At(0)
	assert.Equal(t, 0, resourceMetrics.Resource().Attributes().Len())
	require.Equal(t, 1, resourceMetrics.ScopeMetrics().Len())
	scopeMetrics := resourceMetrics.ScopeMetrics().At(0)
	assert.Equal(t, "signoz", scopeMetrics.Scope().Name())
	assert.Equal(t, "v0.0.1", scopeMetrics.Scope().Version())
	require.Equal(t, 1, scopeMetrics.Metrics().Len())
	metric := scopeMetrics.Metrics().At(0)
	assert.Equal(t, "signoz.meter.metric.datapoint.count", metric.Name())
	require.Equal(t, pmetric.MetricTypeSum, metric.Type())
	assert.Equal(t, pmetric.AggregationTemporalityDelta, metric.Sum().AggregationTemporality())
	assert.True(t, metric.Sum().IsMonotonic())

	dataPoints := metric.Sum().DataPoints()
	require.Equal(t, 2, dataPoints.Len())

	testCases := []struct {
		name       string
		index      int
		value      int64
		attributes map[string]any
	}{
		{name: "AllDimensions", index: 0, value: 31, attributes: map[string]any{"service.name": "frontend", "host.name": "host-1"}},
		{name: "EmptyDimension_Omitted", index: 1, value: 4, attributes: map[string]any{"service.name": "checkout"}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			dataPoint := dataPoints.At(testCase.index)
			assert.Equal(t, testCase.value, dataPoint.IntValue())
			assert.Equal(t, timestamp, dataPoint.Timestamp().AsTime())
			assert.Equal(t, testCase.attributes, dataPoint.Attributes().AsRaw())
		})
	}
}
