package tracesstatementbuilder

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type traceOperatorStatementBuilder struct {
	logger                    *slog.Logger
	metadataStore             telemetrytypes.MetadataStore
	fm                        qbtypes.FieldMapper
	cb                        qbtypes.ConditionBuilder
	traceStmtBuilder          qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	aggExprRewriter           qbtypes.AggExprRewriter
}

var _ qbtypes.TraceOperatorStatementBuilder = (*traceOperatorStatementBuilder)(nil)

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

func NewTraceOperatorStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	aggExprRewriter qbtypes.AggExprRewriter,
	flagger flagger.Flagger,
) *traceOperatorStatementBuilder {
	tracesSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema")

	resourceFilterStmtBuilder := resourcefilter.New[qbtypes.TraceAggregation](
		settings,
		tracestelemetryschema.DBName,
		tracestelemetryschema.TracesResourceV3TableName,
		telemetrytypes.SignalTraces,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		nil,
		flagger,
	)

	return &traceOperatorStatementBuilder{
		logger:                    tracesSettings.Logger(),
		metadataStore:             metadataStore,
		fm:                        fieldMapper,
		cb:                        conditionBuilder,
		traceStmtBuilder:          traceStmtBuilder,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
		aggExprRewriter:           aggExprRewriter,
	}
}

// Build builds a SQL query based on the given parameters.
func (b *traceOperatorStatementBuilder) Build(
	ctx context.Context,
	orgID valuer.UUID,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderTraceOperator,
	compositeQuery *qbtypes.CompositeQuery,
) (*qbtypes.Statement, error) {

	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)

	// Parse the expression if not already parsed
	if query.ParsedExpression == nil {
		if err := query.ParseExpression(); err != nil {
			return nil, err
		}
	}

	// Validate compositeQuery parameter
	if compositeQuery == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "compositeQuery cannot be nil")
	}

	b.logger.DebugContext(ctx, "Building trace operator query",
		slog.String("expression", query.Expression),
		slog.Any("request_type", requestType))

	// Build the CTE-based query
	builder := &traceOperatorCTEBuilder{
		start:          start,
		end:            end,
		orgID:          orgID,
		operator:       &query,
		stmtBuilder:    b,
		queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
		ctes:           []cteNode{}, // Use slice to maintain order
		cteNameToIndex: make(map[string]int),
		queryToCTEName: make(map[string]string),
		compositeQuery: compositeQuery, // Now passed as explicit parameter
	}

	// Collect all referenced queries
	if err := builder.collectQueries(); err != nil {
		return nil, err
	}

	// Build the query
	return builder.build(ctx, requestType)
}
