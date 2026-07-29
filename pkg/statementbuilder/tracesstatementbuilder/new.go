package tracesstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the trace query statement builder. Its
// New internalizes the FieldMapper, ConditionBuilder, and AggExprRewriter, and reads
// SkipResourceFingerprint from the config.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.TraceAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("traces"),
		func(_ context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.TraceAggregation], error) {
			fm := tracestelemetryschema.NewFieldMapper()
			cb := tracestelemetryschema.NewConditionBuilder(fm)
			aggExprRewriter := querybuilder.NewAggExprRewriter(settings, nil, fm, cb, fl)
			return NewTraceQueryStatementBuilder(
				settings, metadataStore, fm, cb, aggExprRewriter, telemetryStore, fl,
				cfg.SkipResourceFingerprint.Enabled, cfg.SkipResourceFingerprint.Threshold,
			), nil
		},
	)
}

// NewOperatorFactory returns a provider factory for the trace-operator statement
// builder. The operator delegates sub-query construction to a trace query statement
// builder, so it builds its own internally — mirroring how the meter factory builds
// its own metrics builder.
func NewOperatorFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.TraceOperatorStatementBuilder, statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("traceoperator"),
		func(_ context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.TraceOperatorStatementBuilder, error) {
			fm := tracestelemetryschema.NewFieldMapper()
			cb := tracestelemetryschema.NewConditionBuilder(fm)
			aggExprRewriter := querybuilder.NewAggExprRewriter(settings, nil, fm, cb, fl)
			traceStmtBuilder := NewTraceQueryStatementBuilder(
				settings, metadataStore, fm, cb, aggExprRewriter, telemetryStore, fl,
				cfg.SkipResourceFingerprint.Enabled, cfg.SkipResourceFingerprint.Threshold,
			)
			return NewTraceOperatorStatementBuilder(
				settings, metadataStore, fm, cb, traceStmtBuilder, aggExprRewriter, fl,
			), nil
		},
	)
}
