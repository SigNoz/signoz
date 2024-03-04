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

func Test_ConvertSummaryCountValToSum(t *testing.T) {
	tests := []summaryTestCase{
		{
			name:         "convert_summary_count_val_to_sum",
			input:        getTestSummaryMetric(),
			temporality:  "delta",
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				summaryMetric := getTestSummaryMetric()
				summaryMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName("summary_metric_count")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetIntValue(100)

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "convert_summary_count_val_to_sum (monotonic)",
			input:        getTestSummaryMetric(),
			temporality:  "delta",
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				summaryMetric := getTestSummaryMetric()
				summaryMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
				sumMetric.Sum().SetIsMonotonic(true)

				sumMetric.SetName("summary_metric_count")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetIntValue(100)

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "convert_summary_count_val_to_sum",
			input:        getTestSummaryMetric(),
			temporality:  "cumulative",
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				summaryMetric := getTestSummaryMetric()
				summaryMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName("summary_metric_count")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetIntValue(100)

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "convert_summary_count_val_to_sum (no op)",
			input:        getTestGaugeMetric(),
			temporality:  "cumulative",
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				gaugeMetric := getTestGaugeMetric()
				gaugeMetric.CopyTo(metrics.AppendEmpty())
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actualMetrics := pmetric.NewMetricSlice()
			tt.input.CopyTo(actualMetrics.AppendEmpty())

			evaluate, err := convertSummaryCountValToSum(tt.temporality, tt.monotonicity)
			assert.NoError(t, err)

			_, err = evaluate(nil, ottldatapoint.NewTransformContext(pmetric.NewNumberDataPoint(), tt.input, actualMetrics, pcommon.NewInstrumentationScope(), pcommon.NewResource()))
			assert.Nil(t, err)

			expected := pmetric.NewMetricSlice()
			tt.want(expected)
			assert.Equal(t, expected, actualMetrics)
		})
	}
}

func Test_ConvertSummaryCountValToSum_validation(t *testing.T) {
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
			_, err := convertSummaryCountValToSum(tt.stringAggTemp, true)
			assert.Error(t, err, "unknown aggregation temporality: not a real aggregation temporality")
		})
	}
}
