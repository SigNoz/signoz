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
	Name string `json:"name" description:"The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it."`

	StepInterval Step `json:"stepInterval,omitzero" description:"The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted."`

	Signal telemetrytypes.Signal `json:"signal,omitempty" description:"The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query."`

	Source telemetrytypes.Source `json:"source" description:"The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry."`

	Aggregations []T `json:"aggregations,omitzero" description:"The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests."`

	BucketOptions *BucketOptions `json:"bucketOptions,omitempty" description:"The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw."`

	Disabled bool `json:"disabled" description:"When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false."`

	Filter *Filter `json:"filter,omitempty" description:"The filter expression that selects the rows or series of this signal."`

	GroupBy []GroupByKey `json:"groupBy,omitzero" description:"The fields to group aggregations by; each group becomes a series or a row with the field as a label or column."`

	Order []OrderBy `json:"order,omitzero" description:"The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp."`

	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitzero" description:"The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests."`

	Limit int `json:"limit,omitempty" description:"The maximum number of rows for raw requests, or of series or rows for grouped aggregations, keeping the top entries by order. When 0, aggregations are unlimited while raw requests ordered by timestamp return a page of 10000 rows; follow nextCursor for the rest."`

	LimitBy *LimitBy `json:"limitBy,omitempty" description:"Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored."`

	Offset int `json:"offset,omitempty" description:"The number of rows to skip before returning results. Prefer cursor for raw requests."`

	Cursor string `json:"cursor,omitempty" description:"The opaque nextCursor value from a previous raw result, used to fetch the next page."`

	Having *Having `json:"having,omitempty" description:"A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100."`

	SecondaryAggregations []SecondaryAggregation `json:"secondaryAggregations,omitzero" description:"Accepted but currently ignored, including their nested order, limit and limitBy."`

	Functions []Function `json:"functions,omitzero" description:"Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly."`

	Legend string `json:"legend" description:"The display name template for each series; {{field}} placeholders are replaced by group-by label values."`

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
	prop.Description = propertyDescription(s, "signal")
	s.Properties["signal"] = prop.ToSchemaOrBool()
	describePropertyForSignal(s, "filter", filterDescriptionsBySignal[signal])
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

	if q.BucketOptions != nil {
		bucketOptionsCopy := *q.BucketOptions
		c.BucketOptions = &bucketOptionsCopy
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

// filterDescriptionsBySignal gives each QueryBuilderQuery instantiation a filter
// example drawn from its own signal, so the traces example never shows up on a
// logs or metrics query. The shared Filter schema stays signal-neutral.
var filterDescriptionsBySignal = map[telemetrytypes.Signal]string{
	telemetrytypes.SignalTraces:  "The filter that selects spans, in the query filter syntax, for example service.name = 'frontend' AND http.response.status_code >= 500.",
	telemetrytypes.SignalLogs:    "The filter that selects log records, in the query filter syntax, for example severity_text = 'ERROR' AND body CONTAINS 'timeout'.",
	telemetrytypes.SignalMetrics: "The filter that selects series by their attributes, in the query filter syntax, for example k8s.namespace.name = 'prod' AND k8s.pod.name LIKE 'api%'.",
}

// describePropertyForSignal replaces a property's description with a
// signal-specific one, keeping whatever schema shape the property already has.
func describePropertyForSignal(s *jsonschema.Schema, name, description string) {
	prop, ok := s.Properties[name]
	if !ok || prop.TypeObject == nil || description == "" {
		return
	}
	prop.TypeObject.Description = &description
	s.Properties[name] = prop
}
