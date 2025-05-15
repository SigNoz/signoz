package querybuildertypesv5

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type QueryEnvelope struct {
	// Name is the unique identifier for the query.
	Name string `json:"name"`
	// Type is the type of the query.
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	// Spec is the deferred decoding of the query if any.
	Spec any `json:"spec"`
}

// implement custom json unmarshaler for the QueryEnvelope
func (q *QueryEnvelope) UnmarshalJSON(data []byte) error {
	var shadow struct {
		Name string          `json:"name"`
		Type QueryType       `json:"type"`
		Spec json.RawMessage `json:"spec"`
	}
	if err := json.Unmarshal(data, &shadow); err != nil {
		return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query envelope")
	}

	q.Name = shadow.Name
	q.Type = shadow.Type

	// 2. Decode the spec based on the Type.
	switch shadow.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		var spec QueryBuilderQuery
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid builder query spec")
		}
		q.Spec = spec

	case QueryTypeFormula:
		var spec QueryBuilderFormula
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid formula spec")
		}
		q.Spec = spec

	case QueryTypeJoin:
		var spec QueryBuilderJoin
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid join spec")
		}
		q.Spec = spec

	case QueryTypePromQL:
		var spec PromQuery
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid PromQL spec")
		}
		q.Spec = spec

	case QueryTypeClickHouseSQL:
		var spec ClickHouseQuery
		if err := json.Unmarshal(shadow.Spec, &spec); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid ClickHouse SQL spec")
		}
		q.Spec = spec

	default:
		return errors.WrapInvalidInputf(nil, errors.CodeInvalidInput, "unknown query type %q", shadow.Type)
	}

	return nil
}

type CompositeQuery struct {
	// Queries is the queries to use for the request.
	Queries []QueryEnvelope `json:"queries"`
}

type QueryRangeRequest struct {
	// SchemaVersion is the version of the schema to use for the request payload.
	SchemaVersion string `json:"schemaVersion"`
	// Start is the start time of the query in epoch milliseconds.
	Start uint64 `json:"start"`
	// End is the end time of the query in epoch milliseconds.
	End uint64 `json:"end"`
	// RequestType is the type of the request.
	RequestType RequestType `json:"requestType"`
	// CompositeQuery is the composite query to use for the request.
	CompositeQuery CompositeQuery `json:"compositeQuery"`
	// Variables is the variables to use for the request.
	Variables map[string]any `json:"variables,omitempty"`
}
