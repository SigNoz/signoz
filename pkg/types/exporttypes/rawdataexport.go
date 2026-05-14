package exporttypes

type ExportRawDataFormatQueryParam struct {
	// Format specifies the output format: "csv" or "jsonl"
	Format string `query:"format,default=csv" default:"csv" enum:"csv,jsonl" description:"The output format for the export."`
}
