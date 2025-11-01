package querybuildertypesv5

type PromQuery struct {
	// Name of the query.
	Name string `json:"name"`
	// Query to execute.
	Query string `json:"query"`
	// Disabled if true, the query will not be executed.
	Disabled bool `json:"disabled"`
	// Step size for the query.
	Step Step `json:"step"`
	// Stats if true, the query will return stats.
	Stats bool `json:"stats"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the PromQuery.
func (q PromQuery) Copy() PromQuery {
	return q // shallow copy is sufficient
}
