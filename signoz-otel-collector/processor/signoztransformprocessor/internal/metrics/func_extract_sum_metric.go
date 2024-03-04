// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metrics"

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlmetric"
)

type extractSumMetricArguments struct {
	Monotonic bool
}

func newExtractSumMetricFactory() ottl.Factory[ottlmetric.TransformContext] {
	return ottl.NewFactory("extract_sum_metric", &extractSumMetricArguments{}, createExtractSumMetricFunction)
}

func createExtractSumMetricFunction(_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[ottlmetric.TransformContext], error) {
	args, ok := oArgs.(*extractSumMetricArguments)

	if !ok {
		return nil, fmt.Errorf("extractSumMetricFactory args must be of type *extractSumMetricArguments")
	}

	return extractSumMetric(args.Monotonic)
}

// this interface helps unify the logic for extracting data from different histogram types
// all supported metric types' datapoints implement it
type SumCountDataPoint interface {
	Attributes() pcommon.Map
	Sum() float64
	Count() uint64
	StartTimestamp() pcommon.Timestamp
	Timestamp() pcommon.Timestamp
}

func extractSumMetric(monotonic bool) (ottl.ExprFunc[ottlmetric.TransformContext], error) {
	return func(_ context.Context, tCtx ottlmetric.TransformContext) (interface{}, error) {
		metric := tCtx.GetMetric()
		invalidMetricTypeError := fmt.Errorf("extract_sum_metric requires an input metric of type Histogram, ExponentialHistogram or Summary, got %s", metric.Type())

		aggTemp := getAggregationTemporality(metric)
		if aggTemp == pmetric.AggregationTemporalityUnspecified {
			return nil, invalidMetricTypeError
		}

		sumMetric := pmetric.NewMetric()
		sumMetric.SetDescription(metric.Description())
		sumMetric.SetName(metric.Name() + "_sum")
		sumMetric.SetUnit(metric.Unit())
		sumMetric.SetEmptySum().SetAggregationTemporality(aggTemp)
		sumMetric.Sum().SetIsMonotonic(monotonic)

		switch metric.Type() {
		case pmetric.MetricTypeHistogram:
			dataPoints := metric.Histogram().DataPoints()
			for i := 0; i < dataPoints.Len(); i++ {
				dataPoint := dataPoints.At(i)
				if dataPoint.HasSum() {
					addSumDataPoint(dataPoint, sumMetric.Sum().DataPoints())
				}
			}
		case pmetric.MetricTypeExponentialHistogram:
			dataPoints := metric.ExponentialHistogram().DataPoints()
			for i := 0; i < dataPoints.Len(); i++ {
				dataPoint := dataPoints.At(i)
				if dataPoint.HasSum() {
					addSumDataPoint(dataPoint, sumMetric.Sum().DataPoints())
				}
			}
		case pmetric.MetricTypeSummary:
			dataPoints := metric.Summary().DataPoints()
			// note that unlike Histograms, the Sum field is required for Summaries
			for i := 0; i < dataPoints.Len(); i++ {
				addSumDataPoint(dataPoints.At(i), sumMetric.Sum().DataPoints())
			}
		default:
			return nil, invalidMetricTypeError
		}

		if sumMetric.Sum().DataPoints().Len() > 0 {
			sumMetric.MoveTo(tCtx.GetMetrics().AppendEmpty())
		}

		return nil, nil
	}, nil
}

func addSumDataPoint(dataPoint SumCountDataPoint, destination pmetric.NumberDataPointSlice) {
	newDp := destination.AppendEmpty()
	dataPoint.Attributes().CopyTo(newDp.Attributes())
	newDp.SetDoubleValue(dataPoint.Sum())
	newDp.SetStartTimestamp(dataPoint.StartTimestamp())
	newDp.SetTimestamp(dataPoint.Timestamp())
}

func getAggregationTemporality(metric pmetric.Metric) pmetric.AggregationTemporality {
	switch metric.Type() {
	case pmetric.MetricTypeHistogram:
		return metric.Histogram().AggregationTemporality()
	case pmetric.MetricTypeExponentialHistogram:
		return metric.ExponentialHistogram().AggregationTemporality()
	case pmetric.MetricTypeSummary:
		// Summaries don't have an aggregation temporality, but they *should* be cumulative based on the Openmetrics spec.
		// This should become an optional argument once those are available in OTTL.
		return pmetric.AggregationTemporalityCumulative
	default:
		return pmetric.AggregationTemporalityUnspecified
	}
}
