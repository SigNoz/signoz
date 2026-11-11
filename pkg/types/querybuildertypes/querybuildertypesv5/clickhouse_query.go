package querybuildertypesv5

type ClickHouseQuery struct {
	Name     string `json:"name" description:"The unique name of the query, such as A."`
	Query    string `json:"query" description:"The ClickHouse SQL statement. Reserved time placeholders such as {{.start_timestamp}}, {{.end_timestamp}}, {{.start_timestamp_ms}} and {{.start_datetime}} and dashboard variables written as {{name}}, [[name]] or $name are substituted before execution."`
	Disabled bool   `json:"disabled" description:"When true, the result is excluded from the response but the query may still run. Defaults to false."`

	Legend string `json:"legend" description:"The display name template for each series; {{column}} placeholders are replaced by result column values."`
}

// Copy creates a deep copy of the ClickHouseQuery.
func (q ClickHouseQuery) Copy() ClickHouseQuery {
	return q
}
