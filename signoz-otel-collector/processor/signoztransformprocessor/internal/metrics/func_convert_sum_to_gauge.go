// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metrics"

import (
	"context"

	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint"
)

func newConvertSumToGaugeFactory() ottl.Factory[ottldatapoint.TransformContext] {
	return ottl.NewFactory("convert_sum_to_gauge", nil, createConvertSumToGaugeFunction)
}

func createConvertSumToGaugeFunction(_ ottl.FunctionContext, _ ottl.Arguments) (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
	return convertSumToGauge()
}

func convertSumToGauge() (ottl.ExprFunc[ottldatapoint.TransformContext], error) {
	return func(_ context.Context, tCtx ottldatapoint.TransformContext) (interface{}, error) {
		metric := tCtx.GetMetric()
		if metric.Type() != pmetric.MetricTypeSum {
			return nil, nil
		}

		dps := metric.Sum().DataPoints()

		// Setting the data type removed all the data points, so we must copy them back to the metric.
		dps.CopyTo(metric.SetEmptyGauge().DataPoints())

		return nil, nil
	}, nil
}
