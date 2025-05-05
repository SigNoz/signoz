package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type QueryType struct {
	valuer.String
}

var (
	QueryTypeUnknown       = QueryType{valuer.NewString("unknown")}
	QueryTypeBuilder       = QueryType{valuer.NewString("builder")}
	QueryTypeClickHouseSQL = QueryType{valuer.NewString("clickhouse_sql")}
	QueryTypePromQL        = QueryType{valuer.NewString("promql")}
)
