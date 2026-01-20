package querybuildertypesv5

type PromQuery struct {
	// name of the query
	Name string `json:"name"`
	// query to execute
	Query string `json:"query"`
	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled"`
	// step size for the query
	Step Step `json:"step"`
	// stats if true, the query will return stats
	Stats bool `json:"stats"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the PromQuery
func (q PromQuery) Copy() PromQuery {
	return q // shallow copy is sufficient
}
