// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signoztransformprocessor // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor"

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/processor/processorhelper"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/logs"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metadata"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metrics"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/traces"
)

var processorCapabilities = consumer.Capabilities{MutatesData: true}

func NewFactory() processor.Factory {
	return processor.NewFactory(
		metadata.Type,
		createDefaultConfig,
		processor.WithLogs(createLogsProcessor, metadata.LogsStability),
		processor.WithTraces(createTracesProcessor, metadata.TracesStability),
		processor.WithMetrics(createMetricsProcessor, metadata.MetricsStability),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		ErrorMode:        ottl.PropagateError,
		TraceStatements:  []common.ContextStatements{},
		MetricStatements: []common.ContextStatements{},
		LogStatements:    []common.ContextStatements{},
	}
}

func createLogsProcessor(
	ctx context.Context,
	set processor.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Logs,
) (processor.Logs, error) {
	oCfg := cfg.(*Config)

	proc, err := logs.NewProcessor(oCfg.LogStatements, oCfg.ErrorMode, set.TelemetrySettings)
	if err != nil {
		return nil, fmt.Errorf("invalid config for \"transform\" processor %w", err)
	}
	return processorhelper.NewLogsProcessor(
		ctx,
		set,
		cfg,
		nextConsumer,
		proc.ProcessLogs,
		processorhelper.WithCapabilities(processorCapabilities))
}

func createTracesProcessor(
	ctx context.Context,
	set processor.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Traces,
) (processor.Traces, error) {
	oCfg := cfg.(*Config)

	proc, err := traces.NewProcessor(oCfg.TraceStatements, oCfg.ErrorMode, set.TelemetrySettings)
	if err != nil {
		return nil, fmt.Errorf("invalid config for \"transform\" processor %w", err)
	}
	return processorhelper.NewTracesProcessor(
		ctx,
		set,
		cfg,
		nextConsumer,
		proc.ProcessTraces,
		processorhelper.WithCapabilities(processorCapabilities))
}

func createMetricsProcessor(
	ctx context.Context,
	set processor.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Metrics,
) (processor.Metrics, error) {
	oCfg := cfg.(*Config)

	proc, err := metrics.NewProcessor(oCfg.MetricStatements, oCfg.ErrorMode, set.TelemetrySettings)
	if err != nil {
		return nil, fmt.Errorf("invalid config for \"transform\" processor %w", err)
	}
	return processorhelper.NewMetricsProcessor(
		ctx,
		set,
		cfg,
		nextConsumer,
		proc.ProcessMetrics,
		processorhelper.WithCapabilities(processorCapabilities))
}
