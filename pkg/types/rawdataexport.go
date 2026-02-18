package types

// ExportRawDataQueryParams represents the query parameters for the export raw data endpoint
type ExportRawDataQueryParams struct {
	ExportRawDataFormatQueryParam

	// Source specifies the type of data to export: "logs" or "traces"
	Source string `query:"source,default=logs" default:"logs" enum:"logs,traces"`

	// Start is the start time for the query (Unix timestamp in nanoseconds)
	Start uint64 `query:"start"`

	// End is the end time for the query (Unix timestamp in nanoseconds)
	End uint64 `query:"end"`

	// Limit specifies the maximum number of rows to export
	Limit int `query:"limit,default=10000" default:"10000" minimum:"1" maximum:"50000"`

	// Filter is a filter expression to apply to the query
	Filter string `query:"filter"`

	// Columns specifies the columns to include in the export
	// Format: ["context.field:type", "context.field", "field"]
	Columns []string `query:"columns"`

	// OrderBy specifies the sorting order
	// Format: "column:direction" or "context.field:type:direction"
	// Direction can be "asc" or "desc"
	OrderBy string `query:"order_by"`
}

type ExportRawDataFormatQueryParam struct {
	// Format specifies the output format: "csv" or "jsonl"
	Format string `query:"format,default=csv" default:"csv" enum:"csv,jsonl"`
}
