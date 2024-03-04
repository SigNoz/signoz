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

func Test_convertSumToGauge(t *testing.T) {
	sumInput := pmetric.NewMetric()

	dp1 := sumInput.SetEmptySum().DataPoints().AppendEmpty()
	dp1.SetIntValue(10)

	dp2 := sumInput.Sum().DataPoints().AppendEmpty()
	dp2.SetDoubleValue(14.5)

	gaugeInput := pmetric.NewMetric()
	gaugeInput.SetEmptyGauge()

	histogramInput := pmetric.NewMetric()
	histogramInput.SetEmptyHistogram()

	expoHistogramInput := pmetric.NewMetric()
	expoHistogramInput.SetEmptyExponentialHistogram()

	summaryInput := pmetric.NewMetric()
	summaryInput.SetEmptySummary()

	tests := []struct {
		name  string
		input pmetric.Metric
		want  func(pmetric.Metric)
	}{
		{
			name:  "convert sum to gauge",
			input: sumInput,
			want: func(metric pmetric.Metric) {
				sumInput.CopyTo(metric)

				dps := sumInput.Sum().DataPoints()
				dps.CopyTo(metric.SetEmptyGauge().DataPoints())
			},
		},
		{
			name:  "noop for gauge",
			input: gaugeInput,
			want: func(metric pmetric.Metric) {
				gaugeInput.CopyTo(metric)
			},
		},
		{
			name:  "noop for histogram",
			input: histogramInput,
			want: func(metric pmetric.Metric) {
				histogramInput.CopyTo(metric)
			},
		},
		{
			name:  "noop for exponential histogram",
			input: expoHistogramInput,
			want: func(metric pmetric.Metric) {
				expoHistogramInput.CopyTo(metric)
			},
		},
		{
			name:  "noop for summary",
			input: summaryInput,
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

			exprFunc, _ := convertSumToGauge()

			_, err := exprFunc(nil, ctx)
			assert.Nil(t, err)

			expected := pmetric.NewMetric()
			tt.want(expected)

			assert.Equal(t, expected, metric)
		})
	}
}
