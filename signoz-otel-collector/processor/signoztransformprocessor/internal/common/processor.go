// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package common // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlresource"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlscope"
)

var _ consumer.Traces = &resourceStatements{}
var _ consumer.Metrics = &resourceStatements{}
var _ consumer.Logs = &resourceStatements{}
var _ baseContext = &resourceStatements{}

type resourceStatements struct {
	ottl.Statements[ottlresource.TransformContext]
}

func (r resourceStatements) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{
		MutatesData: true,
	}
}

func (r resourceStatements) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rspans := td.ResourceSpans().At(i)
		tCtx := ottlresource.NewTransformContext(rspans.Resource())
		err := r.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r resourceStatements) ConsumeMetrics(ctx context.Context, md pmetric.Metrics) error {
	for i := 0; i < md.ResourceMetrics().Len(); i++ {
		rmetrics := md.ResourceMetrics().At(i)
		tCtx := ottlresource.NewTransformContext(rmetrics.Resource())
		err := r.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r resourceStatements) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	for i := 0; i < ld.ResourceLogs().Len(); i++ {
		rlogs := ld.ResourceLogs().At(i)
		tCtx := ottlresource.NewTransformContext(rlogs.Resource())
		err := r.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

var _ consumer.Traces = &scopeStatements{}
var _ consumer.Metrics = &scopeStatements{}
var _ consumer.Logs = &scopeStatements{}
var _ baseContext = &scopeStatements{}

type scopeStatements struct {
	ottl.Statements[ottlscope.TransformContext]
}

func (s scopeStatements) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{
		MutatesData: true,
	}
}

func (s scopeStatements) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rspans := td.ResourceSpans().At(i)
		for j := 0; j < rspans.ScopeSpans().Len(); j++ {
			sspans := rspans.ScopeSpans().At(j)
			tCtx := ottlscope.NewTransformContext(sspans.Scope(), rspans.Resource())
			err := s.Execute(ctx, tCtx)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (s scopeStatements) ConsumeMetrics(ctx context.Context, md pmetric.Metrics) error {
	for i := 0; i < md.ResourceMetrics().Len(); i++ {
		rmetrics := md.ResourceMetrics().At(i)
		for j := 0; j < rmetrics.ScopeMetrics().Len(); j++ {
			smetrics := rmetrics.ScopeMetrics().At(j)
			tCtx := ottlscope.NewTransformContext(smetrics.Scope(), rmetrics.Resource())
			err := s.Execute(ctx, tCtx)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (s scopeStatements) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	for i := 0; i < ld.ResourceLogs().Len(); i++ {
		rlogs := ld.ResourceLogs().At(i)
		for j := 0; j < rlogs.ScopeLogs().Len(); j++ {
			slogs := rlogs.ScopeLogs().At(j)
			tCtx := ottlscope.NewTransformContext(slogs.Scope(), rlogs.Resource())
			err := s.Execute(ctx, tCtx)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

type parserCollection struct {
	settings       component.TelemetrySettings
	resourceParser ottl.Parser[ottlresource.TransformContext]
	scopeParser    ottl.Parser[ottlscope.TransformContext]
	errorMode      ottl.ErrorMode
}

type baseContext interface {
	consumer.Traces
	consumer.Metrics
	consumer.Logs
}

func (pc parserCollection) parseCommonContextStatements(contextStatement ContextStatements) (baseContext, error) {
	switch contextStatement.Context {
	case Resource:
		parsedStatements, err := pc.resourceParser.ParseStatements(contextStatement.Statements)
		if err != nil {
			return nil, err
		}
		rStatements := ottlresource.NewStatements(parsedStatements, pc.settings, ottlresource.WithErrorMode(pc.errorMode))
		return resourceStatements{rStatements}, nil
	case Scope:
		parsedStatements, err := pc.scopeParser.ParseStatements(contextStatement.Statements)
		if err != nil {
			return nil, err
		}
		sStatements := ottlscope.NewStatements(parsedStatements, pc.settings, ottlscope.WithErrorMode(pc.errorMode))
		return scopeStatements{sStatements}, nil
	default:
		return nil, fmt.Errorf("unknown context %v", contextStatement.Context)
	}
}
