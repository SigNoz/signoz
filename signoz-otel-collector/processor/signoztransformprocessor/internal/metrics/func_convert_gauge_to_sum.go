// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metrics"

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint"
)

type convertGaugeToSumArguments struct {
	StringAggTemp string
	Monotonic     bool
}

func newConvertGaugeToSumFactory() ottl.Factory[ottldatapoint.TransformContext] {
	return ottl.NewFactory("convert_gauge_to_sum", &convertGaugeToSumArguments{}, createConvertGaugeToSumFunction)
}

func createConvertGaugeToSumFunction(_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
	args, ok := oArgs.(*convertGaugeToSumArguments)

	if !ok {
		return nil, fmt.Errorf("ConvertGaugeToSumFactory args must be of type *ConvertGaugeToSumArguments")
	}

	return convertGaugeToSum(args.StringAggTemp, args.Monotonic)
}

func convertGaugeToSum(stringAggTemp string, monotonic bool) (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
	var aggTemp pmetric.AggregationTemporality
	switch stringAggTemp {
	case "delta":
		aggTemp = pmetric.AggregationTemporalityDelta
	case "cumulative":
		aggTemp = pmetric.AggregationTemporalityCumulative
	default:
		return nil, fmt.Errorf("unknown aggregation temporality: %s", stringAggTemp)
	}

	return func(_ context.Context, tCtx ottldatapoint.TransformContext) (interface{}, error) {
		metric := tCtx.GetMetric()
		if metric.Type() != pmetric.MetricTypeGauge {
			return nil, nil
		}

		dps := metric.Gauge().DataPoints()

		metric.SetEmptySum().SetAggregationTemporality(aggTemp)
		metric.Sum().SetIsMonotonic(monotonic)

		// Setting the data type removed all the data points, so we must copy them back to the metric.
		dps.CopyTo(metric.Sum().DataPoints())

		return nil, nil
	}, nil
}
