package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

// QueryType is the query builder flavour a field request comes from. Values mirror
// querybuildertypesv5.QueryType, which cannot be imported here because it depends on
// this package; only the flavours whose key set differs are declared.
type QueryType struct {
	valuer.String
}

var (
	QueryTypeUnspecified = QueryType{valuer.NewString("")}
	QueryTypeBuilderAI   = QueryType{valuer.NewString("builder_ai_query")}
)

// Enum returns the acceptable values for QueryType.
func (QueryType) Enum() []any {
	return []any{
		QueryTypeUnspecified,
		QueryTypeBuilderAI,
	}
}
