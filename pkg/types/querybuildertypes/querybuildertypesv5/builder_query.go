package querybuildertypesv5

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type QueryBuilderQuery struct {
	// name of the query, mainly used when query is used in formula
	Name string `json:"name"`

	// stepInterval of the query
	StepInterval Step `json:"stepInterval,omitempty"`

	// signal to query
	Signal telemetrytypes.Signal `json:"signal,omitempty"`

	// we want to support multiple aggregations
	// currently supported: []Aggregation, []MetricAggregation
	Aggregations []any `json:"aggregations,omitempty"`

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
}
