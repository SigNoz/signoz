// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package metrics // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metrics"

import (
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlmetric"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs"
)

func DataPointFunctions() map[string]ottl.Factory[ottldatapoint.TransformContext] {
	functions := ottlfuncs.StandardFuncs[ottldatapoint.TransformContext]()

	datapointFunctions := ottl.CreateFactoryMap[ottldatapoint.TransformContext](
		newConvertSumToGaugeFactory(),
		newConvertGaugeToSumFactory(),
		newConvertSummarySumValToSumFactory(),
		newConvertSummaryCountValToSumFactory(),
	)

	for k, v := range datapointFunctions {
		functions[k] = v
	}

	return functions
}

func MetricFunctions() map[string]ottl.Factory[ottlmetric.TransformContext] {
	functions := ottlfuncs.StandardFuncs[ottlmetric.TransformContext]()

	metricFunctions := ottl.CreateFactoryMap(
		newExtractSumMetricFactory(),
		newExtractCountMetricFactory(),
	)

	for k, v := range metricFunctions {
		functions[k] = v

	}
	return functions
}
