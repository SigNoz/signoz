package querybuildertypesv5

type PromQuery struct {
	Name              string `json:"name" description:"The unique name of the query, such as A."`
	Query             string `json:"query" description:"The PromQL expression. Dotted metric and label names must use the UTF-8 quoted selector form, for example {'http.server.duration'}."`
	Disabled          bool   `json:"disabled" description:"When true, the result is excluded from the response but the query may still run. Defaults to false."`
	Step              Step   `json:"step" description:"The evaluation step: seconds as a number or a Go duration string such as 60s. Derived from the time range when omitted."`
	Stats             bool   `json:"stats" description:"Reserved; currently has no effect."`
	SkipStepAlignment bool   `json:"skipStepAlignment,omitempty" description:"When true, start and end are evaluated as given instead of rounded down to the step, and the result is not cached. Defaults to false."`

	Legend string `json:"legend" description:"The display name template for each series; {{label}} placeholders are replaced by label values."`
}

// Copy creates a deep copy of the PromQuery.
func (q PromQuery) Copy() PromQuery {
	return q // shallow copy is sufficient
}
