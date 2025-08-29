package querybuildertypesv5

type ClickHouseQuery struct {
	// name of the query
	Name string `json:"name"`
	// query to execute
	Query string `json:"query"`
	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the ClickHouseQuery
func (q ClickHouseQuery) Copy() ClickHouseQuery {
	return q
}
