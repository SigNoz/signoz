// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint"
)

func Test_convertGaugeToSum(t *testing.T) {
	gaugeInput := pmetric.NewMetric()

	dp1 := gaugeInput.SetEmptyGauge().DataPoints().AppendEmpty()
	dp1.SetIntValue(10)

	dp2 := gaugeInput.Gauge().DataPoints().AppendEmpty()
	dp2.SetDoubleValue(14.5)

	sumInput := pmetric.NewMetric()
	sumInput.SetEmptySum()

	histogramInput := pmetric.NewMetric()
	histogramInput.SetEmptyHistogram()

	expoHistogramInput := pmetric.NewMetric()
	expoHistogramInput.SetEmptyHistogram()

	summaryInput := pmetric.NewMetric()
	summaryInput.SetEmptySummary()

	tests := []struct {
		name          string
		stringAggTemp string
		monotonic     bool
		input         pmetric.Metric
		want          func(pmetric.Metric)
	}{
		{
			name:          "convert gauge to cumulative sum",
			stringAggTemp: "cumulative",
			monotonic:     false,
			input:         gaugeInput,
			want: func(metric pmetric.Metric) {
				gaugeInput.CopyTo(metric)

				dps := gaugeInput.Gauge().DataPoints()

				metric.SetEmptySum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)
				metric.Sum().SetIsMonotonic(false)

				dps.CopyTo(metric.Sum().DataPoints())
			},
		},
		{
			name:          "convert gauge to delta sum",
			stringAggTemp: "delta",
			monotonic:     true,
			input:         gaugeInput,
			want: func(metric pmetric.Metric) {
				gaugeInput.CopyTo(metric)

				dps := gaugeInput.Gauge().DataPoints()

				metric.SetEmptySum().SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
				metric.Sum().SetIsMonotonic(true)

				dps.CopyTo(metric.Sum().DataPoints())
			},
		},
		{
			name:          "noop for sum",
			stringAggTemp: "delta",
			monotonic:     true,
			input:         sumInput,
			want: func(metric pmetric.Metric) {
				sumInput.CopyTo(metric)
			},
		},
		{
			name:          "noop for histogram",
			stringAggTemp: "delta",
			monotonic:     true,
			input:         histogramInput,
			want: func(metric pmetric.Metric) {
				histogramInput.CopyTo(metric)
			},
		},
		{
			name:          "noop for exponential histogram",
			stringAggTemp: "delta",
			monotonic:     true,
			input:         expoHistogramInput,
			want: func(metric pmetric.Metric) {
				expoHistogramInput.CopyTo(metric)
			},
		},
		{
			name:          "noop for summary",
			stringAggTemp: "delta",
			monotonic:     true,
			input:         summaryInput,
			want: func(metric pmetric.Metric) {
				summaryInput.CopyTo(metric)
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			metric := pmetric.NewMetric()
			tt.input.CopyTo(metric)

			ctx := ottldatapoint.NewTransformContext(pmetric.NewNumberDataPoint(), metric, pmetric.NewMetricSlice(), pcommon.NewInstrumentationScope(), pcommon.NewResource())

			exprFunc, _ := convertGaugeToSum(tt.stringAggTemp, tt.monotonic)

			_, err := exprFunc(nil, ctx)
			assert.Nil(t, err)

			expected := pmetric.NewMetric()
			tt.want(expected)

			assert.Equal(t, expected, metric)
		})
	}
}

func Test_convertGaugeToSum_validation(t *testing.T) {
	tests := []struct {
		name          string
		stringAggTemp string
	}{
		{
			name:          "invalid aggregation temporality",
			stringAggTemp: "not a real aggregation temporality",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := convertGaugeToSum(tt.stringAggTemp, true)
			assert.Error(t, err, "unknown aggregation temporality: not a real aggregation temporality")
		})
	}
}
