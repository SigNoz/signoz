package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type QueryBuilderKind struct {
	valuer.String
}

var (
	QueryBuilderKindQuery    = QueryBuilderKind{valuer.NewString("query")}
	QueryBuilderKindFormula  = QueryBuilderKind{valuer.NewString("formula")}
	QueryBuilderKindSubQuery = QueryBuilderKind{valuer.NewString("sub_query")}
	QueryBuilderKindJoin     = QueryBuilderKind{valuer.NewString("join")}
)
