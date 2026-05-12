package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/errors"

type ClickHouseQuery struct {
	// name of the query
	Name string `json:"name"`
	// query to execute
	Query string `json:"query"`
	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the ClickHouseQuery.
func (q ClickHouseQuery) Copy() ClickHouseQuery {
	return q
}

// Validate performs preliminary validation on ClickHouseQuery.
func (q ClickHouseQuery) Validate() error {
	if q.Query == "" {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"ClickHouse SQL query is required",
		)
	}
	if len(q.Query) > MaxClickHouseQueryLength {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"ClickHouse SQL query exceeds maximum allowed length of %d characters",
			MaxClickHouseQueryLength,
		)
	}
	return nil
}
