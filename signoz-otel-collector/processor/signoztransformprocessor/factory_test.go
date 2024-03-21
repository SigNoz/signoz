// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signoztransformprocessor

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/processor/processortest"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/metadata"
)

func TestFactory_Type(t *testing.T) {
	factory := NewFactory()
	assert.Equal(t, factory.Type(), component.Type(metadata.Type))
}

func TestFactory_CreateDefaultConfig(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	assert.Equal(t, cfg, &Config{
		ErrorMode:        ottl.PropagateError,
		TraceStatements:  []common.ContextStatements{},
		MetricStatements: []common.ContextStatements{},
		LogStatements:    []common.ContextStatements{},
	})
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
}

func TestFactoryCreateProcessor_Empty(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	err := component.ValidateConfig(cfg)
	assert.NoError(t, err)
}

func TestFactoryCreateTracesProcessor_InvalidActions(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.TraceStatements = []common.ContextStatements{
		{
			Context:    "span",
			Statements: []string{`set(123`},
		},
	}
	ap, err := factory.CreateTracesProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, ap)
}

func TestFactoryCreateTracesProcessor(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.ErrorMode = ottl.IgnoreError
	oCfg.TraceStatements = []common.ContextStatements{
		{
			Context: "span",
			Statements: []string{
				`set(attributes["test"], "pass") where name == "operationA"`,
				`set(attributes["test error mode"], ParseJSON(1)) where name == "operationA"`,
			},
		},
	}
	tp, err := factory.CreateTracesProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.NotNil(t, tp)
	assert.NoError(t, err)

	td := ptrace.NewTraces()
	span := td.ResourceSpans().AppendEmpty().ScopeSpans().AppendEmpty().Spans().AppendEmpty()
	span.SetName("operationA")

	_, ok := span.Attributes().Get("test")
	assert.False(t, ok)

	err = tp.ConsumeTraces(context.Background(), td)
	assert.NoError(t, err)

	val, ok := span.Attributes().Get("test")
	assert.True(t, ok)
	assert.Equal(t, "pass", val.Str())
}

func TestFactoryCreateMetricsProcessor_InvalidActions(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.ErrorMode = ottl.IgnoreError
	oCfg.MetricStatements = []common.ContextStatements{
		{
			Context:    "datapoint",
			Statements: []string{`set(123`},
		},
	}
	ap, err := factory.CreateMetricsProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, ap)
}

func TestFactoryCreateMetricsProcessor(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.ErrorMode = ottl.IgnoreError
	oCfg.MetricStatements = []common.ContextStatements{
		{
			Context: "datapoint",
			Statements: []string{
				`set(attributes["test"], "pass") where metric.name == "operationA"`,
				`set(attributes["test error mode"], ParseJSON(1)) where metric.name == "operationA"`,
			},
		},
	}
	metricsProcessor, err := factory.CreateMetricsProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.NotNil(t, metricsProcessor)
	assert.NoError(t, err)

	metrics := pmetric.NewMetrics()
	metric := metrics.ResourceMetrics().AppendEmpty().ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()
	metric.SetName("operationA")

	_, ok := metric.SetEmptySum().DataPoints().AppendEmpty().Attributes().Get("test")
	assert.False(t, ok)

	err = metricsProcessor.ConsumeMetrics(context.Background(), metrics)
	assert.NoError(t, err)

	val, ok := metric.Sum().DataPoints().At(0).Attributes().Get("test")
	assert.True(t, ok)
	assert.Equal(t, "pass", val.Str())
}

func TestFactoryCreateLogsProcessor(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.ErrorMode = ottl.IgnoreError
	oCfg.LogStatements = []common.ContextStatements{
		{
			Context: "log",
			Statements: []string{
				`set(attributes["test"], "pass") where body == "operationA"`,
				`set(attributes["test error mode"], ParseJSON(1)) where body == "operationA"`,
			},
		},
	}
	lp, err := factory.CreateLogsProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.NotNil(t, lp)
	assert.NoError(t, err)

	ld := plog.NewLogs()
	log := ld.ResourceLogs().AppendEmpty().ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()
	log.Body().SetStr("operationA")

	_, ok := log.Attributes().Get("test")
	assert.False(t, ok)

	err = lp.ConsumeLogs(context.Background(), ld)
	assert.NoError(t, err)

	val, ok := log.Attributes().Get("test")
	assert.True(t, ok)
	assert.Equal(t, "pass", val.Str())
}

func TestFactoryCreateLogsProcessor_InvalidActions(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	oCfg := cfg.(*Config)
	oCfg.LogStatements = []common.ContextStatements{
		{
			Context:    "log",
			Statements: []string{`set(123`},
		},
	}
	ap, err := factory.CreateLogsProcessor(context.Background(), processortest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, ap)
}
