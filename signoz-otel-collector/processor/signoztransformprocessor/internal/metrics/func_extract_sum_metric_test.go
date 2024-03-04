// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlmetric"
)

func getTestHistogramMetric() pmetric.Metric {
	metricInput := pmetric.NewMetric()
	metricInput.SetEmptyHistogram()
	metricInput.SetName("histogram_metric")
	metricInput.Histogram().SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
	input := metricInput.Histogram().DataPoints().AppendEmpty()
	input.SetCount(5)
	input.SetSum(12.34)

	input.BucketCounts().Append(2, 3)
	input.ExplicitBounds().Append(1)

	attrs := getTestAttributes()
	attrs.CopyTo(input.Attributes())
	return metricInput
}

func getTestExponentialHistogramMetric() pmetric.Metric {
	metricInput := pmetric.NewMetric()
	metricInput.SetEmptyExponentialHistogram()
	metricInput.SetName("exponential_histogram_metric")
	metricInput.ExponentialHistogram().SetAggregationTemporality(pmetric.AggregationTemporalityDelta)
	input := metricInput.ExponentialHistogram().DataPoints().AppendEmpty()
	input.SetScale(1)
	input.SetCount(5)
	input.SetSum(12.34)

	attrs := getTestAttributes()
	attrs.CopyTo(input.Attributes())
	return metricInput
}

func getTestSummaryMetric() pmetric.Metric {
	metricInput := pmetric.NewMetric()
	metricInput.SetEmptySummary()
	metricInput.SetName("summary_metric")
	input := metricInput.Summary().DataPoints().AppendEmpty()
	input.SetCount(100)
	input.SetSum(12.34)

	qVal1 := input.QuantileValues().AppendEmpty()
	qVal1.SetValue(1)
	qVal1.SetQuantile(.99)

	qVal2 := input.QuantileValues().AppendEmpty()
	qVal2.SetValue(2)
	qVal2.SetQuantile(.95)

	qVal3 := input.QuantileValues().AppendEmpty()
	qVal3.SetValue(3)
	qVal3.SetQuantile(.50)

	attrs := getTestAttributes()
	attrs.CopyTo(input.Attributes())
	return metricInput
}

func getTestGaugeMetric() pmetric.Metric {
	metricInput := pmetric.NewMetric()
	metricInput.SetEmptyGauge()
	metricInput.SetName("gauge_metric")
	input := metricInput.Gauge().DataPoints().AppendEmpty()
	input.SetIntValue(12)

	attrs := getTestAttributes()
	attrs.CopyTo(input.Attributes())
	return metricInput
}

func getTestAttributes() pcommon.Map {
	attrs := pcommon.NewMap()
	attrs.PutStr("test", "hello world")
	attrs.PutInt("test2", 3)
	attrs.PutBool("test3", true)
	return attrs
}

type histogramTestCase struct {
	name         string
	input        pmetric.Metric
	monotonicity bool
	want         func(pmetric.MetricSlice)
	wantErr      error
}

func Test_extractSumMetric(t *testing.T) {
	tests := []histogramTestCase{
		{
			name:         "histogram (non-monotonic)",
			input:        getTestHistogramMetric(),
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				histogramMetric := getTestHistogramMetric()
				histogramMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(histogramMetric.Histogram().AggregationTemporality())
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName(histogramMetric.Name() + "_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(histogramMetric.Histogram().DataPoints().At(0).Sum())

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "histogram (monotonic)",
			input:        getTestHistogramMetric(),
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				histogramMetric := getTestHistogramMetric()
				histogramMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(histogramMetric.Histogram().AggregationTemporality())
				sumMetric.Sum().SetIsMonotonic(true)

				sumMetric.SetName(histogramMetric.Name() + "_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(histogramMetric.Histogram().DataPoints().At(0).Sum())

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name: "histogram (no sum)",
			input: func() pmetric.Metric {
				metric := getTestHistogramMetric()
				metric.Histogram().DataPoints().At(0).RemoveSum()
				return metric
			}(),
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				histogramMetric := getTestHistogramMetric()
				histogramMetric.Histogram().DataPoints().At(0).RemoveSum()
				histogramMetric.CopyTo(metrics.AppendEmpty())
			},
		},
		{
			name:         "exponential histogram (non-monotonic)",
			input:        getTestExponentialHistogramMetric(),
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				expHistogramMetric := getTestExponentialHistogramMetric()
				expHistogramMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(expHistogramMetric.ExponentialHistogram().AggregationTemporality())
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName(expHistogramMetric.Name() + "_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(expHistogramMetric.ExponentialHistogram().DataPoints().At(0).Sum())

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "exponential histogram (monotonic)",
			input:        getTestExponentialHistogramMetric(),
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				expHistogramMetric := getTestExponentialHistogramMetric()
				expHistogramMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(expHistogramMetric.ExponentialHistogram().AggregationTemporality())
				sumMetric.Sum().SetIsMonotonic(true)

				sumMetric.SetName(expHistogramMetric.Name() + "_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(expHistogramMetric.ExponentialHistogram().DataPoints().At(0).Sum())

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "exponential histogram (non-monotonic)",
			input:        getTestExponentialHistogramMetric(),
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				expHistogramMetric := getTestExponentialHistogramMetric()
				expHistogramMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(expHistogramMetric.ExponentialHistogram().AggregationTemporality())
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName(expHistogramMetric.Name() + "_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(expHistogramMetric.ExponentialHistogram().DataPoints().At(0).Sum())

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name: "exponential histogram (no sum)",
			input: func() pmetric.Metric {
				metric := getTestExponentialHistogramMetric()
				metric.ExponentialHistogram().DataPoints().At(0).RemoveSum()
				return metric
			}(),
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				expHistogramMetric := getTestExponentialHistogramMetric()
				expHistogramMetric.ExponentialHistogram().DataPoints().At(0).RemoveSum()
				expHistogramMetric.CopyTo(metrics.AppendEmpty())
			},
		},
		{
			name:         "summary (non-monotonic)",
			input:        getTestSummaryMetric(),
			monotonicity: false,
			want: func(metrics pmetric.MetricSlice) {
				summaryMetric := getTestSummaryMetric()
				summaryMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)
				sumMetric.Sum().SetIsMonotonic(false)

				sumMetric.SetName("summary_metric_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(12.34)

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "summary (monotonic)",
			input:        getTestSummaryMetric(),
			monotonicity: true,
			want: func(metrics pmetric.MetricSlice) {
				summaryMetric := getTestSummaryMetric()
				summaryMetric.CopyTo(metrics.AppendEmpty())
				sumMetric := metrics.AppendEmpty()
				sumMetric.SetEmptySum()
				sumMetric.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)
				sumMetric.Sum().SetIsMonotonic(true)

				sumMetric.SetName("summary_metric_sum")
				dp := sumMetric.Sum().DataPoints().AppendEmpty()
				dp.SetDoubleValue(12.34)

				attrs := getTestAttributes()
				attrs.CopyTo(dp.Attributes())
			},
		},
		{
			name:         "gauge (error)",
			input:        getTestGaugeMetric(),
			monotonicity: false,
			wantErr:      fmt.Errorf("extract_sum_metric requires an input metric of type Histogram, ExponentialHistogram or Summary, got Gauge"),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actualMetrics := pmetric.NewMetricSlice()
			tt.input.CopyTo(actualMetrics.AppendEmpty())

			evaluate, err := extractSumMetric(tt.monotonicity)
			assert.NoError(t, err)

			_, err = evaluate(nil, ottlmetric.NewTransformContext(tt.input, actualMetrics, pcommon.NewInstrumentationScope(), pcommon.NewResource()))
			assert.Equal(t, tt.wantErr, err)

			if tt.want != nil {
				expected := pmetric.NewMetricSlice()
				tt.want(expected)
				assert.Equal(t, expected, actualMetrics)
			}
		})
	}
}
