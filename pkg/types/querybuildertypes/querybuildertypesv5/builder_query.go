package querybuildertypesv5

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type QueryBuilderQuery[T any] struct {
	// name of the query, mainly used when query is used in formula
	Name string `json:"name"`

	// stepInterval of the query
	StepInterval Step `json:"stepInterval,omitempty"`

	// signal to query
	Signal telemetrytypes.Signal `json:"signal,omitempty"`

	// we want to support multiple aggregations
	// currently supported: []Aggregation, []MetricAggregation
	Aggregations []T `json:"aggregations,omitempty"`

	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled,omitempty"`

	// search query is simple string
	Filter *Filter `json:"filter,omitempty"`

	// group by keys to group by
	GroupBy []GroupByKey `json:"groupBy,omitempty"`

	// order by keys and directions
	Order []OrderBy `json:"order,omitempty"`

	// select columns to select
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`

	// limit the maximum number of rows to return
	Limit int `json:"limit,omitempty"`

	// limitBy fields to limit by
	LimitBy LimitBy `json:"limitBy,omitempty"`

	// offset the number of rows to skip
	// TODO: remove this once we have cursor-based pagination everywhere?
	Offset int `json:"offset,omitempty"`

	// cursor to paginate the query
	Cursor string `json:"cursor,omitempty"`

	// having clause to apply to the query
	Having *Having `json:"having,omitempty"`

	// secondary aggregation to apply to the query
	// on top of the primary aggregation
	SecondaryAggregations []SecondaryAggregation `json:"secondaryAggregations,omitempty"`

	// functions to apply to the query
	Functions []Function `json:"functions,omitempty"`

	// ShiftBy is extracted from timeShift function for internal use
	// This field is not serialized to JSON
	ShiftBy int64 `json:"-"`
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields
func (q *QueryBuilderQuery[T]) UnmarshalJSON(data []byte) error {
	// Define a type alias to avoid infinite recursion
	type Alias QueryBuilderQuery[T]

	var temp Alias
	// Use UnmarshalJSONWithContext for better error messages
	if err := UnmarshalJSONWithContext(data, &temp, "query spec"); err != nil {
		return err
	}

	// Copy the decoded values back to the original struct
	*q = QueryBuilderQuery[T](temp)

	return nil
}
