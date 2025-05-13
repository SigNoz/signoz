package querybuildertypesv5

type QueryEnvelope struct {
	Name string    `json:"name"` // unique identifier
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	Spec any       `json:"spec"` // deferred decoding if any
}

type CompositeQuery struct {
	Queries map[string]QueryEnvelope `json:"queries"`
}

type QueryRangeRequest struct {
	SchemaVersion  string         `json:"schemaVersion"`
	Start          uint64         `json:"start"`
	End            uint64         `json:"end"`
	RequestType    RequestType    `json:"requestType"`
	CompositeQuery CompositeQuery `json:"compositeQuery"`
	Variables      map[string]any `json:"variables,omitempty"`
	FillGaps       bool           `json:"fillGaps,omitempty"`
}
