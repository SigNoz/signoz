package querybuildertypesv5

type ClickHouseQuery struct {
	// Name of the query.
	Name string `json:"name"`
	// Query to execute.
	Query string `json:"query"`
	// Disabled if true, the query will not be executed.
	Disabled bool `json:"disabled"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the ClickHouseQuery.
func (q ClickHouseQuery) Copy() ClickHouseQuery {
	return q
}
