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

type convertSummaryCountValToSumArguments struct {
	StringAggTemp string
	Monotonic     bool
}

func newConvertSummaryCountValToSumFactory() ottl.Factory[ottldatapoint.TransformContext] {
	return ottl.NewFactory("convert_summary_count_val_to_sum", &convertSummaryCountValToSumArguments{}, createConvertSummaryCountValToSumFunction)
}

func createConvertSummaryCountValToSumFunction(_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
	args, ok := oArgs.(*convertSummaryCountValToSumArguments)

	if !ok {
		return nil, fmt.Errorf("convertSummaryCountValToSumFactory args must be of type *convertSummaryCountValToSumArguments")
	}

	return convertSummaryCountValToSum(args.StringAggTemp, args.Monotonic)
}

func convertSummaryCountValToSum(stringAggTemp string, monotonic bool) (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
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
		if metric.Type() != pmetric.MetricTypeSummary {
			return nil, nil
		}

		sumMetric := tCtx.GetMetrics().AppendEmpty()
		sumMetric.SetDescription(metric.Description())
		sumMetric.SetName(metric.Name() + "_count")
		sumMetric.SetUnit(metric.Unit())
		sumMetric.SetEmptySum().SetAggregationTemporality(aggTemp)
		sumMetric.Sum().SetIsMonotonic(monotonic)

		sumDps := sumMetric.Sum().DataPoints()
		dps := metric.Summary().DataPoints()
		for i := 0; i < dps.Len(); i++ {
			dp := dps.At(i)
			sumDp := sumDps.AppendEmpty()
			dp.Attributes().CopyTo(sumDp.Attributes())
			sumDp.SetIntValue(int64(dp.Count()))
			sumDp.SetStartTimestamp(dp.StartTimestamp())
			sumDp.SetTimestamp(dp.Timestamp())
		}
		return nil, nil
	}, nil
}
