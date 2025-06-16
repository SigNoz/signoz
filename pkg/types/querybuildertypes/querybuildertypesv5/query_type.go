package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type QueryType struct {
	valuer.String
}

var (
	QueryTypeUnknown       = QueryType{valuer.NewString("unknown")}
	QueryTypeBuilder       = QueryType{valuer.NewString("builder_query")}
	QueryTypeFormula       = QueryType{valuer.NewString("builder_formula")}
	QueryTypeSubQuery      = QueryType{valuer.NewString("builder_sub_query")}
	QueryTypeJoin          = QueryType{valuer.NewString("builder_join")}
	QueryTypeTraceOperator = QueryType{valuer.NewString("builder_trace_operator")}
	QueryTypeClickHouseSQL = QueryType{valuer.NewString("clickhouse_sql")}
	QueryTypePromQL        = QueryType{valuer.NewString("promql")}
)
