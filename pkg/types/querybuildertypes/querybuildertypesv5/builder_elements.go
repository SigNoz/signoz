package querybuildertypesv5

import (
	"encoding/json"
	"math"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Step struct{ time.Duration }

func (s *Step) UnmarshalJSON(b []byte) error {
	if len(b) == 0 {
		return nil
	}
	if b[0] == '"' { // "15s", "1m", ISO‑8601
		var str string
		if err := json.Unmarshal(b, &str); err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid step")
		}
		d, err := time.ParseDuration(str)
		if err != nil {
			return errors.WrapInvalidInputf(
				err,
				errors.CodeInvalidInput,
				"invalid step, expected a duration string (example: 15s, 1m, 1h), valid time units are ns, u, ms, s, m, h",
			)
		}
		s.Duration = d
		return nil
	}
	var sec float64
	if err := json.Unmarshal(b, &sec); err != nil {
		return errors.WrapInvalidInputf(
			err,
			errors.CodeInvalidInput,
			"invalid step, expected duration in seconds (example: 60 - 1 minute, 240 - 4 minutes, 3600 - 1 hour)",
		)
	}
	s.Duration = time.Duration(sec * float64(time.Second))
	return nil
}

func (s Step) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.Duration.Seconds())
}

// Copy creates a copy of Step
func (s Step) Copy() Step {
	return s
}

// FilterOperator is the operator for the filter.
type FilterOperator int

const (
	FilterOperatorUnknown FilterOperator = iota
	FilterOperatorEqual
	FilterOperatorNotEqual
	FilterOperatorGreaterThan
	FilterOperatorGreaterThanOrEq
	FilterOperatorLessThan
	FilterOperatorLessThanOrEq

	FilterOperatorLike
	FilterOperatorNotLike
	FilterOperatorILike
	FilterOperatorNotILike

	FilterOperatorBetween
	FilterOperatorNotBetween

	FilterOperatorIn
	FilterOperatorNotIn

	FilterOperatorExists
	FilterOperatorNotExists

	FilterOperatorRegexp
	FilterOperatorNotRegexp

	FilterOperatorContains
	FilterOperatorNotContains
)

// AddDefaultExistsFilter returns true if addl exists filter should be added to the query
// For the negative predicates, we don't want to add the exists filter. Why?
// Say for example, user adds a filter `service.name != "redis"`, we can't interpret it
// unambiguously i.e do they mean to fetch logs that satisfy
// service.name != "redis" or do they mean to fetch logs that have `service.name` field and
// doesn't have value "redis"
// Since we don't know the intent, we don't add the exists filter. They are expected
// to add exists filter themselves if exclusion is desired.
//
// For the positive predicates, the key existence is implied.
func (f FilterOperator) AddDefaultExistsFilter() bool {
	switch f {
	case
		FilterOperatorEqual,
		FilterOperatorGreaterThan,
		FilterOperatorGreaterThanOrEq,
		FilterOperatorLessThan,
		FilterOperatorLessThanOrEq,
		FilterOperatorLike,
		FilterOperatorILike,
		FilterOperatorBetween,
		FilterOperatorIn,
		FilterOperatorRegexp,
		FilterOperatorContains:
		return true
	}
	return false
}

func (f FilterOperator) IsNegativeOperator() bool {
	switch f {
	case
		FilterOperatorEqual,
		FilterOperatorGreaterThan,
		FilterOperatorGreaterThanOrEq,
		FilterOperatorLessThan,
		FilterOperatorLessThanOrEq,
		FilterOperatorLike,
		FilterOperatorILike,
		FilterOperatorBetween,
		FilterOperatorIn,
		FilterOperatorExists,
		FilterOperatorRegexp,
		FilterOperatorContains:
		return false
	}
	return true
}

func (f FilterOperator) IsComparisonOperator() bool {
	switch f {
	case FilterOperatorGreaterThan, FilterOperatorGreaterThanOrEq, FilterOperatorLessThan, FilterOperatorLessThanOrEq:
		return true
	}
	return false
}

type OrderDirection struct {
	valuer.String
}

var (
	OrderDirectionAsc  = OrderDirection{valuer.NewString("asc")}
	OrderDirectionDesc = OrderDirection{valuer.NewString("desc")}
)

var (
	OrderDirectionMap = map[string]OrderDirection{
		"asc":  OrderDirectionAsc,
		"desc": OrderDirectionDesc,
	}
)

type ReduceTo struct {
	valuer.String
}

var (
	ReduceToUnknown = ReduceTo{valuer.NewString("")}
	ReduceToSum     = ReduceTo{valuer.NewString("sum")}
	ReduceToCount   = ReduceTo{valuer.NewString("count")}
	ReduceToAvg     = ReduceTo{valuer.NewString("avg")}
	ReduceToMin     = ReduceTo{valuer.NewString("min")}
	ReduceToMax     = ReduceTo{valuer.NewString("max")}
	ReduceToLast    = ReduceTo{valuer.NewString("last")}
	ReduceToMedian  = ReduceTo{valuer.NewString("median")}
)

// FunctionReduceTo applies the reduceTo operator to a time series and returns a new series with the reduced value
// reduceTo can be one of: last, sum, avg, min, max, count, median
// if reduceTo is not recognized, the function returns the original series
func FunctionReduceTo(result *TimeSeries, reduceTo ReduceTo) *TimeSeries {
	if len(result.Values) == 0 {
		return result
	}

	var reducedValue float64
	var reducedTimestamp int64

	switch reduceTo {
	case ReduceToLast:
		// Take the last point's value and timestamp
		lastPoint := result.Values[len(result.Values)-1]
		reducedValue = lastPoint.Value
		reducedTimestamp = lastPoint.Timestamp

	case ReduceToSum:
		// Sum all values, use last timestamp
		var sum float64
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) {
				sum += point.Value
			}
		}
		reducedValue = sum
		reducedTimestamp = result.Values[len(result.Values)-1].Timestamp

	case ReduceToAvg:
		// Calculate average of all values, use last timestamp
		var sum float64
		var count int
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) {
				sum += point.Value
				count++
			}
		}
		if count > 0 {
			reducedValue = sum / float64(count)
		} else {
			reducedValue = math.NaN()
		}
		reducedTimestamp = result.Values[len(result.Values)-1].Timestamp

	case ReduceToMin:
		// Find minimum value, use its timestamp
		var min float64 = math.Inf(1)
		var minTimestamp int64
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) && point.Value < min {
				min = point.Value
				minTimestamp = point.Timestamp
			}
		}
		if math.IsInf(min, 1) {
			reducedValue = math.NaN()
			reducedTimestamp = result.Values[len(result.Values)-1].Timestamp
		} else {
			reducedValue = min
			reducedTimestamp = minTimestamp
		}

	case ReduceToMax:
		// Find maximum value, use its timestamp
		var max float64 = math.Inf(-1)
		var maxTimestamp int64
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) && point.Value > max {
				max = point.Value
				maxTimestamp = point.Timestamp
			}
		}
		if math.IsInf(max, -1) {
			reducedValue = math.NaN()
			reducedTimestamp = result.Values[len(result.Values)-1].Timestamp
		} else {
			reducedValue = max
			reducedTimestamp = maxTimestamp
		}

	case ReduceToCount:
		// Count non-NaN values, use last timestamp
		var count float64
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) {
				count++
			}
		}
		reducedValue = count
		reducedTimestamp = result.Values[len(result.Values)-1].Timestamp

	case ReduceToMedian:
		// Calculate median of all non-NaN values
		// maintain pair of value and timestamp and sort by value
		var values []struct {
			Value     float64
			Timestamp int64
		}
		for _, point := range result.Values {
			if !math.IsNaN(point.Value) {
				values = append(values, struct {
					Value     float64
					Timestamp int64
				}{
					Value:     point.Value,
					Timestamp: point.Timestamp,
				})
			}
		}

		if len(values) == 0 {
			reducedValue = math.NaN()
			reducedTimestamp = result.Values[len(result.Values)-1].Timestamp
		} else {
			slices.SortFunc(values, func(i, j struct {
				Value     float64
				Timestamp int64
			}) int {
				if i.Value < j.Value {
					return -1
				}
				if i.Value > j.Value {
					return 1
				}
				return 0
			})

			if len(values)%2 == 0 {
				// Even number of values - average of middle two
				mid := len(values) / 2
				reducedValue = (values[mid-1].Value + values[mid].Value) / 2
				reducedTimestamp = (values[mid-1].Timestamp + values[mid].Timestamp) / 2
			} else {
				// Odd number of values - middle value
				reducedValue = values[len(values)/2].Value
				reducedTimestamp = values[len(values)/2].Timestamp
			}
		}

	case ReduceToUnknown:
		fallthrough
	default:
		// No reduction, return original series
		return result
	}

	// Create new TimeSeries with single reduced point
	reducedSeries := &TimeSeries{
		Labels: result.Labels, // Preserve original labels
		Values: []*TimeSeriesValue{
			{
				Timestamp: reducedTimestamp,
				Value:     reducedValue,
			},
		},
	}

	return reducedSeries
}

type TraceAggregation struct {
	// aggregation expression - example: count(), sum(item_price), countIf(day > 10)
	Expression string `json:"expression"`
	// if any, it will be used as the alias of the aggregation in the result
	Alias string `json:"alias,omitempty"`
}

// Copy creates a deep copy of TraceAggregation
func (t TraceAggregation) Copy() TraceAggregation {
	return t
}

type LogAggregation struct {
	// aggregation expression - example: count(), sum(item_price), countIf(day > 10)
	Expression string `json:"expression"`
	// if any, it will be used as the alias of the aggregation in the result
	Alias string `json:"alias,omitempty"`
}

// Copy creates a deep copy of LogAggregation
func (l LogAggregation) Copy() LogAggregation {
	return l
}

type MetricAggregation struct {
	// metric to query
	MetricName string `json:"metricName"`
	// type of the metric
	Type metrictypes.Type `json:"-"`
	// temporality to apply to the query
	Temporality metrictypes.Temporality `json:"temporality"`
	// time aggregation to apply to the query
	TimeAggregation metrictypes.TimeAggregation `json:"timeAggregation"`
	// space aggregation to apply to the query
	SpaceAggregation metrictypes.SpaceAggregation `json:"spaceAggregation"`
	// table hints to use for the query
	TableHints *metrictypes.MetricTableHints `json:"-"`
	// value filter to apply to the query
	ValueFilter *metrictypes.MetricValueFilter `json:"-"`
	// reduce to operator for metric scalar requests
	ReduceTo ReduceTo `json:"reduceTo,omitempty"`
}

// Copy creates a deep copy of MetricAggregation
func (m MetricAggregation) Copy() MetricAggregation {
	c := m
	if m.TableHints != nil {
		tableHintsCopy := *m.TableHints
		c.TableHints = &tableHintsCopy
	}
	if m.ValueFilter != nil {
		valueFilterCopy := *m.ValueFilter
		c.ValueFilter = &valueFilterCopy
	}
	return c
}

type Filter struct {
	// expression to filter by following the filter syntax
	Expression string `json:"expression"`
}

// Copy creates a deep copy of Filter
func (f *Filter) Copy() *Filter {
	if f == nil {
		return nil
	}
	return &Filter{
		Expression: f.Expression,
	}
}

type GroupByKey struct {
	telemetrytypes.TelemetryFieldKey
}

// Copy creates a deep copy of GroupByKey
func (g GroupByKey) Copy() GroupByKey {
	return g
}

type Having struct {
	// expression to filter by following the filter syntax
	Expression string `json:"expression"`
}

// Copy creates a deep copy of Having
func (h *Having) Copy() *Having {
	if h == nil {
		return nil
	}
	return &Having{
		Expression: h.Expression,
	}
}

type OrderByKey struct {
	telemetrytypes.TelemetryFieldKey
}

// Copy creates a deep copy of OrderByKey
func (o OrderByKey) Copy() OrderByKey {
	return o
}

// key to order by
type OrderBy struct {
	// key to order by
	Key OrderByKey `json:"key"`
	// direction to order by
	Direction OrderDirection `json:"direction"`
}

// Copy creates a deep copy of OrderBy
func (o OrderBy) Copy() OrderBy {
	return OrderBy{
		Key:       o.Key.Copy(),
		Direction: o.Direction,
	}
}

// secondary aggregation to apply to the query
type SecondaryAggregation struct {
	// stepInterval of the query
	// if not set, it will use the step interval of the primary aggregation
	StepInterval Step `json:"stepInterval,omitempty"`
	// expression to aggregate. example: count(), sum(item_price), countIf(day > 10)
	Expression string `json:"expression"`
	// if any, it will be used as the alias of the aggregation in the result
	Alias string `json:"alias,omitempty"`
	// groupBy fields to group by
	GroupBy []GroupByKey `json:"groupBy,omitempty"`
	// order by keys and directions
	Order []OrderBy `json:"order,omitempty"`
	// limit the maximum number of rows to return
	Limit int `json:"limit,omitempty"`
	// limitBy fields to limit by
	LimitBy *LimitBy `json:"limitBy,omitempty"`
}

// Copy creates a deep copy of SecondaryAggregation
func (s SecondaryAggregation) Copy() SecondaryAggregation {
	c := s

	if s.GroupBy != nil {
		c.GroupBy = make([]GroupByKey, len(s.GroupBy))
		for i, gb := range s.GroupBy {
			c.GroupBy[i] = gb.Copy()
		}
	}

	if s.Order != nil {
		c.Order = make([]OrderBy, len(s.Order))
		for i, o := range s.Order {
			c.Order[i] = o.Copy()
		}
	}

	if s.LimitBy != nil {
		c.LimitBy = s.LimitBy.Copy()
	}

	return c
}

type FunctionArg struct {
	// name of the argument
	Name string `json:"name,omitempty"`
	// value of the argument
	Value any `json:"value"`
}

// Copy creates a deep copy of FunctionArg
func (f FunctionArg) Copy() FunctionArg {
	// value is an interface{}, we keep it as-is
	// in practice, it's usually primitives (string, float64, etc)
	return f
}

type Function struct {
	// name of the function
	Name FunctionName `json:"name"`

	// args is the arguments to the function
	Args []FunctionArg `json:"args,omitempty"`
}

// Copy creates a deep copy of Function
func (f Function) Copy() Function {
	c := f

	if f.Args != nil {
		c.Args = make([]FunctionArg, len(f.Args))
		for i, arg := range f.Args {
			c.Args[i] = arg.Copy()
		}
	}

	return c
}

type LimitBy struct {
	// keys to limit by
	Keys []string `json:"keys"`
	// value to limit by
	Value string `json:"value"`
}

// Copy creates a deep copy of LimitBy
func (l *LimitBy) Copy() *LimitBy {
	if l == nil {
		return nil
	}
	c := &LimitBy{
		Value: l.Value,
	}
	if l.Keys != nil {
		c.Keys = make([]string, len(l.Keys))
		copy(c.Keys, l.Keys)
	}
	return c
}
