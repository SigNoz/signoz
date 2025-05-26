package querybuildertypesv5

import (
	"encoding/json"
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
	var sec float64 // 30 → 30 s ; 0.5 → 500 ms
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
	// Emit human‑friendly string → "30s"
	return json.Marshal(s.Duration.String())
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

type OrderDirection struct {
	valuer.String
}

var (
	OrderDirectionAsc  = OrderDirection{valuer.NewString("asc")}
	OrderDirectionDesc = OrderDirection{valuer.NewString("desc")}
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

type TraceAggregation struct {
	// aggregation expression - example: count(), sum(item_price), countIf(day > 10)
	Expression string `json:"expression"`
	// if any, it will be used as the alias of the aggregation in the result
	Alias string `json:"alias,omitempty"`
}

type LogAggregation struct {
	// aggregation expression - example: count(), sum(item_price), countIf(day > 10)
	Expression string `json:"expression"`
	// if any, it will be used as the alias of the aggregation in the result
	Alias string `json:"alias,omitempty"`
}

type MetricAggregation struct {
	// metric to query
	MetricName string `json:"metricName"`
	// temporality to apply to the query
	Temporality metrictypes.Temporality `json:"temporality"`
	// time aggregation to apply to the query
	TimeAggregation metrictypes.TimeAggregation `json:"timeAggregation"`
	// space aggregation to apply to the query
	SpaceAggregation metrictypes.SpaceAggregation `json:"spaceAggregation"`
}

type Filter struct {
	// expression to filter by following the filter syntax
	Expression string `json:"expression"`
}

type GroupByKey struct {
	telemetrytypes.TelemetryFieldKey
}

type Having struct {
	// expression to filter by following the filter syntax
	Expression string `json:"expression"`
}

type OrderByKey struct {
	telemetrytypes.TelemetryFieldKey
}

// key to order by
type OrderBy struct {
	// key to order by
	Key OrderByKey `json:"key"`
	// direction to order by
	Direction OrderDirection `json:"direction"`
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
	LimitBy LimitBy `json:"limitBy,omitempty"`
}

type Function struct {
	// name of the function
	Name string `json:"name"`

	// args is the arguments to the function
	Args []struct {
		// name of the argument
		Name string `json:"name,omitempty"`
		// value of the argument
		Value string `json:"value"`
	} `json:"args,omitempty"`
}

type LimitBy struct {
	// keys to limit by
	Keys []string `json:"keys"`
	// value to limit by
	Value string `json:"value"`
}
