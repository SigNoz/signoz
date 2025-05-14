package querybuildertypesv5

type QueryEnvelope struct {
	// Name is the unique identifier for the query.
	Name string `json:"name"`
	// Type is the type of the query.
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	// Spec is the deferred decoding of the query if any.
	Spec any `json:"spec"`
}

type CompositeQuery struct {
	// Queries is the queries to use for the request.
	Queries map[string]QueryEnvelope `json:"queries"`
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
	// FillGaps is the flag to fill gaps in the query.
	FillGaps bool `json:"fillGaps,omitempty"`
}
