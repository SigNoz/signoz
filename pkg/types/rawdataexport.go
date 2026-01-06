package types

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// ExportRawDataQueryParams represents the query parameters for the export raw data endpoint
type ExportRawDataQueryParams struct {
	// Source specifies the type of data to export: "logs", "metrics", or "traces"
	Source string `json:"source" schema:"source"`

	// Format specifies the output format: "csv" or "jsonl"
	Format string `json:"format" schema:"format"`

	// Start is the start time for the query (Unix timestamp in nanoseconds)
	Start uint64 `json:"start" schema:"start"`

	// End is the end time for the query (Unix timestamp in nanoseconds)
	End uint64 `json:"end" schema:"end"`

	// Limit specifies the maximum number of rows to export
	Limit int `json:"limit" schema:"limit"`

	// Filter is a filter expression to apply to the query
	Filter string `json:"filter" schema:"filter"`

	// Columns specifies the columns to include in the export
	// Format: ["context.field:type", "context.field", "field"]
	Columns []string `json:"columns" schema:"columns"`

	// OrderBy specifies the sorting order
	// Format: "column:direction" or "context.field:type:direction"
	// Direction can be "asc" or "desc"
	OrderBy string `json:"order_by" schema:"order_by"`

	// CompositeQuery is an advanced query specification as JSON-encoded QueryEnvelope array
	// When provided, this overrides filter, columns, order_by, and limit parameters
	CompositeQuery []qbtypes.QueryEnvelope `json:"composite_query" schema:"composite_query"`
}
