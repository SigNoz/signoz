package querybuildertypesv5

import (
	"bytes"
	"fmt"
	"slices"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/swaggest/jsonschema-go"
)

type QueryBuilderQuery[T any] struct {
	// name of the query, mainly used when query is used in formula
	Name string `json:"name"`

	// stepInterval of the query
	StepInterval Step `json:"stepInterval,omitzero"`

	// signal to query
	Signal telemetrytypes.Signal `json:"signal,omitempty"`

	// source for query
	Source telemetrytypes.Source `json:"source"`

	// we want to support multiple aggregations
	// currently supported: []Aggregation, []MetricAggregation
	Aggregations []T `json:"aggregations,omitzero"`

	// disabled if true, the query will not be executed
	Disabled bool `json:"disabled"`

	// search query is simple string
	Filter *Filter `json:"filter,omitempty"`

	// group by keys to group by
	GroupBy []GroupByKey `json:"groupBy,omitzero"`

	// order by keys and directions
	Order []OrderBy `json:"order,omitzero"`

	// select columns to select
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitzero"`

	// limit the maximum number of rows to return
	Limit int `json:"limit,omitempty"`

	// limitBy fields to limit by
	LimitBy *LimitBy `json:"limitBy,omitempty"`

	// offset the number of rows to skip
	// TODO: remove this once we have cursor-based pagination everywhere?
	Offset int `json:"offset,omitempty"`

	// cursor to paginate the query
	Cursor string `json:"cursor,omitempty"`

	// having clause to apply to the query
	Having *Having `json:"having,omitempty"`

	// secondary aggregation to apply to the query
	// on top of the primary aggregation
	SecondaryAggregations []SecondaryAggregation `json:"secondaryAggregations,omitzero"`

	// functions to apply to the query
	Functions []Function `json:"functions,omitzero"`

	Legend string `json:"legend"`

	// ShiftBy is extracted from timeShift function for internal use
	// This field is not serialized to JSON
	ShiftBy int64 `json:"-"`
}

// PrepareJSONSchema pins `signal` to the single value implied by the aggregation
// type T, as an inline single-value enum, and marks it required. This lets a
// oneOf over the QueryBuilderQuery[T] instantiations be discriminated by signal.
func (QueryBuilderQuery[T]) PrepareJSONSchema(s *jsonschema.Schema) error {
	var signal telemetrytypes.Signal
	switch any(*new(T)).(type) {
	case LogAggregation:
		signal = telemetrytypes.SignalLogs
	case MetricAggregation:
		signal = telemetrytypes.SignalMetrics
	case TraceAggregation:
		signal = telemetrytypes.SignalTraces
	default:
		return nil
	}
	if _, ok := s.Properties["signal"]; !ok {
		return nil
	}
	prop := (&jsonschema.Schema{}).WithType(jsonschema.String.Type()).WithEnum(signal.StringValue())
	s.Properties["signal"] = prop.ToSchemaOrBool()
	if !slices.Contains(s.Required, "signal") {
		s.Required = append(s.Required, "signal")
	}
	return nil
}

// Copy creates a deep copy of the QueryBuilderQuery.
func (q QueryBuilderQuery[T]) Copy() QueryBuilderQuery[T] {
	// start with a shallow copy
	c := q

	if q.Aggregations != nil {
		c.Aggregations = make([]T, len(q.Aggregations))
		copy(c.Aggregations, q.Aggregations)
	}

	if q.GroupBy != nil {
		c.GroupBy = make([]GroupByKey, len(q.GroupBy))
		for i, gb := range q.GroupBy {
			c.GroupBy[i] = gb.Copy()
		}
	}

	if q.Order != nil {
		c.Order = make([]OrderBy, len(q.Order))
		for i, o := range q.Order {
			c.Order[i] = o.Copy()
		}
	}

	if q.SelectFields != nil {
		c.SelectFields = make([]telemetrytypes.TelemetryFieldKey, len(q.SelectFields))
		copy(c.SelectFields, q.SelectFields)
	}

	if q.SecondaryAggregations != nil {
		c.SecondaryAggregations = make([]SecondaryAggregation, len(q.SecondaryAggregations))
		for i, sa := range q.SecondaryAggregations {
			c.SecondaryAggregations[i] = sa.Copy()
		}
	}

	if q.Functions != nil {
		c.Functions = make([]Function, len(q.Functions))
		for i, f := range q.Functions {
			c.Functions[i] = f.Copy()
		}
	}

	if q.Filter != nil {
		c.Filter = q.Filter.Copy()
	}

	if q.LimitBy != nil {
		c.LimitBy = q.LimitBy.Copy()
	}

	if q.Having != nil {
		c.Having = q.Having.Copy()
	}

	return c
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields.
func (q *QueryBuilderQuery[T]) UnmarshalJSON(data []byte) error {
	// Define a type alias to avoid infinite recursion
	type Alias QueryBuilderQuery[T]

	var temp Alias
	// Strict-decode the alias so unknown fields surface with field-name suggestions.
	if err := binding.JSON.BindBody(bytes.NewReader(data), &temp, binding.WithDisallowUnknownFields(true), binding.WithUnknownFieldContext(fmt.Sprintf("query spec for %T", q))); err != nil {
		return err
	}

	// Copy the decoded values back to the original struct
	*q = QueryBuilderQuery[T](temp)

	// Nomarlize the query after unmarshaling
	q.Normalize()
	return nil
}

// Normalize normalizes all the field keys in the query.
func (q *QueryBuilderQuery[T]) Normalize() {

	// normalize select fields
	for idx := range q.SelectFields {
		q.SelectFields[idx].Normalize()
	}

	// normalize group by fields
	for idx := range q.GroupBy {
		q.GroupBy[idx].Normalize()
	}

	// normalize order by fields
	for idx := range q.Order {
		q.Order[idx].Key.Normalize()
	}

	// normalize secondary aggregations
	for idx := range q.SecondaryAggregations {
		for jdx := range q.SecondaryAggregations[idx].Order {
			q.SecondaryAggregations[idx].Order[jdx].Key.Normalize()
		}
		for jdx := range q.SecondaryAggregations[idx].GroupBy {
			q.SecondaryAggregations[idx].GroupBy[jdx].Normalize()
		}
	}

}

// Fast‑path (no fingerprint grouping)
// canShortCircuitDelta returns true if we can use the optimized query
// for the given query
// This is used to avoid the group by fingerprint thus improving the performance
// for certain queries
// cases where we can short circuit:
// 1. time aggregation = (rate|increase) and space aggregation = sum
//   - rate = sum(value)/step, increase = sum(value) - sum of sums is same as sum of all values
//
// 2. time aggregation = sum and space aggregation = sum
//   - sum of sums is same as sum of all values
//
// 3. time aggregation = min and space aggregation = min
//   - min of mins is same as min of all values
//
// 4. time aggregation = max and space aggregation = max
//   - max of maxs is same as max of all values
//
// 5. special case exphist, there is no need for per series/fingerprint aggregation
// we can directly use the quantilesDDMerge function
//
// all of this is true only for delta metrics.
func CanShortCircuitDelta(metricAgg MetricAggregation) bool {

	if metricAgg.Temporality != metrictypes.Delta {
		return false
	}

	ta := metricAgg.TimeAggregation
	sa := metricAgg.SpaceAggregation

	if (ta == metrictypes.TimeAggregationRate || ta == metrictypes.TimeAggregationIncrease) &&
		sa == metrictypes.SpaceAggregationSum {
		return true
	}
	if ta == metrictypes.TimeAggregationSum && sa == metrictypes.SpaceAggregationSum {
		return true
	}
	if ta == metrictypes.TimeAggregationMin && sa == metrictypes.SpaceAggregationMin {
		return true
	}
	if ta == metrictypes.TimeAggregationMax && sa == metrictypes.SpaceAggregationMax {
		return true
	}
	if metricAgg.Type == metrictypes.ExpHistogramType && sa.IsPercentile() {
		return true
	}

	return false
}

// CanShortCircuitReduced is like CanShortCircuitDelta but for reduced.
func CanShortCircuitReduced(metricAgg MetricAggregation) bool {
	if metricAgg.ValueFilter != nil {
		return false
	}

	ta := metricAgg.TimeAggregation
	sa := metricAgg.SpaceAggregation

	if metricAgg.Type == metrictypes.SumType || metricAgg.Type == metrictypes.HistogramType {
		return (ta == metrictypes.TimeAggregationRate || ta == metrictypes.TimeAggregationIncrease || ta == metrictypes.TimeAggregationSum) &&
			sa == metrictypes.SpaceAggregationSum
	}

	if ta == metrictypes.TimeAggregationSum && sa == metrictypes.SpaceAggregationSum {
		return true
	}
	if ta == metrictypes.TimeAggregationMin && sa == metrictypes.SpaceAggregationMin {
		return true
	}
	if ta == metrictypes.TimeAggregationMax && sa == metrictypes.SpaceAggregationMax {
		return true
	}

	return false
}
