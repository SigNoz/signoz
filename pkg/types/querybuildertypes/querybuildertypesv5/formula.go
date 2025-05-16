package querybuildertypesv5

type QueryBuilderFormula struct {
	// name of the formula
	Name string `json:"name"`
	// expression to apply to the query
	Expression string `json:"expression"`

	// functions to apply to the formula result
	Functions []Function `json:"functions,omitempty"`
}
