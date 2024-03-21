// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package common // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"

import (
	"context"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlmetric"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlresource"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlscope"
)

var _ consumer.Metrics = &metricStatements{}

type metricStatements struct {
	ottl.Statements[ottlmetric.TransformContext]
}

func (m metricStatements) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{
		MutatesData: true,
	}
}

func (m metricStatements) ConsumeMetrics(ctx context.Context, md pmetric.Metrics) error {
	for i := 0; i < md.ResourceMetrics().Len(); i++ {
		rmetrics := md.ResourceMetrics().At(i)
		for j := 0; j < rmetrics.ScopeMetrics().Len(); j++ {
			smetrics := rmetrics.ScopeMetrics().At(j)
			metrics := smetrics.Metrics()
			for k := 0; k < metrics.Len(); k++ {
				tCtx := ottlmetric.NewTransformContext(metrics.At(k), smetrics.Metrics(), smetrics.Scope(), rmetrics.Resource())
				err := m.Execute(ctx, tCtx)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

var _ consumer.Metrics = &dataPointStatements{}

type dataPointStatements struct {
	ottl.Statements[ottldatapoint.TransformContext]
}

func (d dataPointStatements) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{
		MutatesData: true,
	}
}

func (d dataPointStatements) ConsumeMetrics(ctx context.Context, md pmetric.Metrics) error {
	for i := 0; i < md.ResourceMetrics().Len(); i++ {
		rmetrics := md.ResourceMetrics().At(i)
		for j := 0; j < rmetrics.ScopeMetrics().Len(); j++ {
			smetrics := rmetrics.ScopeMetrics().At(j)
			metrics := smetrics.Metrics()
			for k := 0; k < metrics.Len(); k++ {
				metric := metrics.At(k)
				var err error
				//exhaustive:enforce
				switch metric.Type() {
				case pmetric.MetricTypeSum:
					err = d.handleNumberDataPoints(ctx, metric.Sum().DataPoints(), metrics.At(k), metrics, smetrics.Scope(), rmetrics.Resource())
				case pmetric.MetricTypeGauge:
					err = d.handleNumberDataPoints(ctx, metric.Gauge().DataPoints(), metrics.At(k), metrics, smetrics.Scope(), rmetrics.Resource())
				case pmetric.MetricTypeHistogram:
					err = d.handleHistogramDataPoints(ctx, metric.Histogram().DataPoints(), metrics.At(k), metrics, smetrics.Scope(), rmetrics.Resource())
				case pmetric.MetricTypeExponentialHistogram:
					err = d.handleExponetialHistogramDataPoints(ctx, metric.ExponentialHistogram().DataPoints(), metrics.At(k), metrics, smetrics.Scope(), rmetrics.Resource())
				case pmetric.MetricTypeSummary:
					err = d.handleSummaryDataPoints(ctx, metric.Summary().DataPoints(), metrics.At(k), metrics, smetrics.Scope(), rmetrics.Resource())
				}
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (d dataPointStatements) handleNumberDataPoints(ctx context.Context, dps pmetric.NumberDataPointSlice, metric pmetric.Metric, metrics pmetric.MetricSlice, is pcommon.InstrumentationScope, resource pcommon.Resource) error {
	for i := 0; i < dps.Len(); i++ {
		tCtx := ottldatapoint.NewTransformContext(dps.At(i), metric, metrics, is, resource)
		err := d.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d dataPointStatements) handleHistogramDataPoints(ctx context.Context, dps pmetric.HistogramDataPointSlice, metric pmetric.Metric, metrics pmetric.MetricSlice, is pcommon.InstrumentationScope, resource pcommon.Resource) error {
	for i := 0; i < dps.Len(); i++ {
		tCtx := ottldatapoint.NewTransformContext(dps.At(i), metric, metrics, is, resource)
		err := d.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d dataPointStatements) handleExponetialHistogramDataPoints(ctx context.Context, dps pmetric.ExponentialHistogramDataPointSlice, metric pmetric.Metric, metrics pmetric.MetricSlice, is pcommon.InstrumentationScope, resource pcommon.Resource) error {
	for i := 0; i < dps.Len(); i++ {
		tCtx := ottldatapoint.NewTransformContext(dps.At(i), metric, metrics, is, resource)
		err := d.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d dataPointStatements) handleSummaryDataPoints(ctx context.Context, dps pmetric.SummaryDataPointSlice, metric pmetric.Metric, metrics pmetric.MetricSlice, is pcommon.InstrumentationScope, resource pcommon.Resource) error {
	for i := 0; i < dps.Len(); i++ {
		tCtx := ottldatapoint.NewTransformContext(dps.At(i), metric, metrics, is, resource)
		err := d.Execute(ctx, tCtx)
		if err != nil {
			return err
		}
	}
	return nil
}

type MetricParserCollection struct {
	parserCollection
	metricParser    ottl.Parser[ottlmetric.TransformContext]
	dataPointParser ottl.Parser[ottldatapoint.TransformContext]
}

type MetricParserCollectionOption func(*MetricParserCollection) error

func WithMetricParser(functions map[string]ottl.Factory[ottlmetric.TransformContext]) MetricParserCollectionOption {
	return func(mp *MetricParserCollection) error {
		metricParser, err := ottlmetric.NewParser(functions, mp.settings)
		if err != nil {
			return err
		}
		mp.metricParser = metricParser
		return nil
	}
}

func WithDataPointParser(functions map[string]ottl.Factory[ottldatapoint.TransformContext]) MetricParserCollectionOption {
	return func(mp *MetricParserCollection) error {
		dataPointParser, err := ottldatapoint.NewParser(functions, mp.settings)
		if err != nil {
			return err
		}
		mp.dataPointParser = dataPointParser
		return nil
	}
}

func WithMetricErrorMode(errorMode ottl.ErrorMode) MetricParserCollectionOption {
	return func(mp *MetricParserCollection) error {
		mp.errorMode = errorMode
		return nil
	}
}

func NewMetricParserCollection(settings component.TelemetrySettings, options ...MetricParserCollectionOption) (*MetricParserCollection, error) {
	rp, err := ottlresource.NewParser(ResourceFunctions(), settings)
	if err != nil {
		return nil, err
	}
	sp, err := ottlscope.NewParser(ScopeFunctions(), settings)
	if err != nil {
		return nil, err
	}
	mpc := &MetricParserCollection{
		parserCollection: parserCollection{
			settings:       settings,
			resourceParser: rp,
			scopeParser:    sp,
		},
	}

	for _, op := range options {
		err := op(mpc)
		if err != nil {
			return nil, err
		}
	}

	return mpc, nil
}

func (pc MetricParserCollection) ParseContextStatements(contextStatements ContextStatements) (consumer.Metrics, error) {
	switch contextStatements.Context {
	case Metric:
		parseStatements, err := pc.metricParser.ParseStatements(contextStatements.Statements)
		if err != nil {
			return nil, err
		}
		mStatements := ottlmetric.NewStatements(parseStatements, pc.settings, ottlmetric.WithErrorMode(pc.errorMode))
		return metricStatements{mStatements}, nil
	case DataPoint:
		parsedStatements, err := pc.dataPointParser.ParseStatements(contextStatements.Statements)
		if err != nil {
			return nil, err
		}
		dpStatements := ottldatapoint.NewStatements(parsedStatements, pc.settings, ottldatapoint.WithErrorMode(pc.errorMode))
		return dataPointStatements{dpStatements}, nil
	default:
		statements, err := pc.parseCommonContextStatements(contextStatements)
		if err != nil {
			return nil, err
		}
		return statements, nil
	}
}
