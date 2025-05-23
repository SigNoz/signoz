package resourcefilter

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type ResourceFilterStatementBuilderOpts struct {
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	Compiler         qbtypes.FilterCompiler
}

var (
	ErrUnsupportedSignal = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal type")
)

type resourceFilterStatementBuilder struct {
	opts     ResourceFilterStatementBuilderOpts
	fm       qbtypes.FieldMapper
	cb       qbtypes.ConditionBuilder
	compiler qbtypes.FilterCompiler
}

var _ qbtypes.StatementBuilder[qbtypes.Aggregation] = (*resourceFilterStatementBuilder)(nil)

func NewResourceFilterStatementBuilder(opts ResourceFilterStatementBuilderOpts) *resourceFilterStatementBuilder {
	return &resourceFilterStatementBuilder{
		opts:     opts,
		fm:       opts.FieldMapper,
		cb:       opts.ConditionBuilder,
		compiler: opts.Compiler,
	}
}

// Build builds a SQL query for traces based on the given parameters
func (b *resourceFilterStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.Aggregation],
) (*qbtypes.Statement, error) {

	var tableName, dbName string
	switch query.Signal {
	case telemetrytypes.SignalTraces:
		tableName = TraceResourceV3TableName
		dbName = TracesDBName
	case telemetrytypes.SignalLogs:
		tableName = LogsResourceV2TableName
		dbName = LogsDBName
	default:
		return nil, ErrUnsupportedSignal
	}

	q := sqlbuilder.ClickHouse.NewSelectBuilder()

	q.Select("fingerprint")
	q.From(fmt.Sprintf("%s.%s", dbName, tableName))

	b.addFilterCondition(q, start, end, query)

	stmt, args := q.Build()

	return &qbtypes.Statement{
		Query: stmt,
		Args:  args,
	}, nil
}

// buildFilterCondition builds SQL condition from filter expression
func (b *resourceFilterStatementBuilder) addFilterCondition(sb *sqlbuilder.SelectBuilder, start, end uint64, query qbtypes.QueryBuilderQuery[qbtypes.Aggregation]) error {

	filterWhereClause, _, err := b.compiler.Compile(context.Background(), query.Filter.Expression)

	if err != nil {
		return err
	}

	if filterWhereClause != nil {
		sb.AddWhereClause(filterWhereClause)
	}

	// add time filter
	start_bucket := start/1000000000 - 1800
	end_bucket := end / 1000000000

	sb.Where(sb.GE("seen_at_ts_bucket_start", start_bucket), sb.LE("seen_at_ts_bucket_start", end_bucket))

	return nil
}
