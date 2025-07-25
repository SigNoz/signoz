package telemetrytraces

import (
	"context"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"log/slog"
)

type traceOperatorStatementBuilder struct {
	logger           *slog.Logger
	metadataStore    telemetrytypes.MetadataStore
	fm               qbtypes.FieldMapper
	cb               qbtypes.ConditionBuilder
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	aggExprRewriter  qbtypes.AggExprRewriter
}

var _ qbtypes.TraceOperatorStatementBuilder = (*traceOperatorStatementBuilder)(nil)

func NewTraceOperatorStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	aggExprRewriter qbtypes.AggExprRewriter,
) *traceOperatorStatementBuilder {
	tracesSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrytraces")
	return &traceOperatorStatementBuilder{
		logger:           tracesSettings.Logger(),
		metadataStore:    metadataStore,
		fm:               fieldMapper,
		cb:               conditionBuilder,
		traceStmtBuilder: traceStmtBuilder,
		aggExprRewriter:  aggExprRewriter,
	}
}

func (b *traceOperatorStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderTraceOperator,
) (*qbtypes.Statement, error) {

	start = querybuilder.ToNanoSecs(start)
	end = querybuilder.ToNanoSecs(end)

	// Parse the expression if not already parsed
	if query.ParsedExpression == nil {
		if err := query.ParseExpression(); err != nil {
			return nil, err
		}
	}

	// Retrieve composite query from context using the same context key type
	compositeQuery, ok := ctx.Value(qbtypes.CompositeQueryContextKey).(*qbtypes.CompositeQuery)
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "composite query not found in context")
	}

	// Build the CTE-based query
	builder := &traceOperatorCTEBuilder{
		ctx:            ctx,
		start:          start,
		end:            end,
		operator:       &query,
		stmtBuilder:    b,
		queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
		ctes:           []cteNode{}, // Use slice to maintain order
		cteNameToIndex: make(map[string]int),
		queryToCTEName: make(map[string]string),
		compositeQuery: compositeQuery,
	}

	// Collect all referenced queries
	if err := builder.collectQueries(); err != nil {
		return nil, err
	}

	// Build the query
	return builder.build(requestType)
}
