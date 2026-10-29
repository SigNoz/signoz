package ruletypes

import (
	"encoding/json"
	"sort"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	// how long before re-sending the alert.
	ResolvedRetention = 15 * time.Minute
	TestAlertPostFix  = "_TEST_ALERT"
	AlertTimeFormat   = "2006-01-02 15:04:05"
)

type Alert struct {
	State AlertState

	Labels      Labels
	Annotations Labels

	QueryResultLabels Labels

	GeneratorURL string

	// list of preferred receivers, e.g. slack
	Receivers []string

	Value      float64
	ActiveAt   time.Time
	FiredAt    time.Time
	ResolvedAt time.Time
	LastSentAt time.Time
	ValidUntil time.Time

	Missing      bool
	IsRecovering bool
}

type NamedAlert struct {
	Name string
	*Alert
}

func (a *Alert) NeedsSending(ts time.Time, resendDelay time.Duration) bool {
	if a.State == StatePending {
		return false
	}

	// if an alert has been resolved since the last send, resend it
	if a.ResolvedAt.After(a.LastSentAt) {
		return true
	}

	return a.LastSentAt.Add(resendDelay).Before(ts)
}

type PanelType struct {
	valuer.String
}

var (
	PanelTypeValue = PanelType{valuer.NewString("value")}
	PanelTypeTable = PanelType{valuer.NewString("table")}
	PanelTypeGraph = PanelType{valuer.NewString("graph")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for PanelType.
func (PanelType) Enum() []any {
	return []any{
		PanelTypeValue,
		PanelTypeTable,
		PanelTypeGraph,
	}
}

// Note: this is used to represent the state of the alert query
// i.e the active tab which should be used to represent the selection

type QueryType struct {
	valuer.String
}

var (
	QueryTypeBuilder       = QueryType{String: valuer.NewString("builder")}
	QueryTypeClickHouseSQL = QueryType{valuer.NewString("clickhouse_sql")}
	QueryTypePromQL        = QueryType{valuer.NewString("promql")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for QueryType.
func (QueryType) Enum() []any {
	return []any{
		QueryTypeBuilder,
		QueryTypeClickHouseSQL,
		QueryTypePromQL,
	}
}

type AlertCompositeQuery struct {
	Queries []qbtypes.QueryEnvelope `json:"queries" required:"true" description:"The queries to evaluate, at least one. Every envelope type must match queryType: builder_query and builder_formula for builder, promql for promql, clickhouse_sql for clickhouse_sql."`

	PanelType PanelType `json:"panelType" required:"true" description:"The panel the UI renders the queries with: graph, table or value. Use graph for alerts."`
	QueryType QueryType `json:"queryType" required:"true" description:"The query language of every query: builder, promql or clickhouse_sql."`
	Unit      string    `json:"unit,omitempty" description:"The unit of the query result, such as percent, ms or bytes. Used to format values in notifications and to convert thresholds given in a different targetUnit."`
}

type RuleCondition struct {
	CompositeQuery    *AlertCompositeQuery `json:"compositeQuery" required:"true" description:"The queries whose result is compared against the thresholds."`
	CompareOperator   CompareOperator      `json:"op,omitzero" description:"schemaVersion v1 only: how the value is compared with target. Accepted as above, below, equal, not_equal, above_or_equal, below_or_equal or outside_bounds, their symbols, or the legacy codes as strings, '1' to '7'. Required for v1; v2alpha1 sets op on each threshold."`
	Target            *float64             `json:"target,omitempty" format:"double" description:"schemaVersion v1 only: the value compared against, in targetUnit. Required for v1; v2alpha1 sets target on each threshold."`
	AlertOnAbsent     bool                 `json:"alertOnAbsent,omitempty" description:"Whether to fire a nodata alert when the query returns no data. Defaults to false."`
	AbsentFor         uint64               `json:"absentFor,omitempty" description:"How many minutes without data pass before the nodata alert fires. Ignored unless alertOnAbsent is true."`
	MatchType         MatchType            `json:"matchType,omitzero" description:"schemaVersion v1 only: which points in the window must satisfy op. Accepted as at_least_once, all_the_times, on_average, in_total or last, their aliases avg and sum, or the legacy codes as strings, '1' to '5'. Required for v1; v2alpha1 sets matchType on each threshold."`
	TargetUnit        string               `json:"targetUnit,omitempty" description:"schemaVersion v1 only: the unit of target, such as percent or ms. Converted to compositeQuery.unit before comparison when the two differ."`
	Algorithm         string               `json:"algorithm,omitempty" description:"anomaly_rule only: the anomaly detection algorithm. The supported value is standard."`
	Seasonality       Seasonality          `json:"seasonality,omitzero" description:"anomaly_rule only: the seasonal period the history is compared against, hourly, daily or weekly."`
	SelectedQuery     string               `json:"selectedQueryName,omitempty" required:"true" description:"The name of the query whose result is evaluated, such as A or F1. Must match a query in compositeQuery."`
	RequireMinPoints  bool                 `json:"requireMinPoints,omitempty" description:"Whether a series is skipped until it has at least requiredNumPoints points in the window. Defaults to false."`
	RequiredNumPoints int                  `json:"requiredNumPoints,omitempty" description:"The minimum number of points a series needs before it is evaluated. Must be greater than 0 when requireMinPoints is true."`
	Thresholds        *RuleThresholdData   `json:"thresholds,omitempty" required:"true" description:"The thresholds to evaluate, as a kind and spec."`
}

func (rc *RuleCondition) SelectedQueryName() string {
	if rc.SelectedQuery != "" {
		return rc.SelectedQuery
	}
	if rc.CompositeQuery == nil {
		return ""
	}

	queryNames := map[string]struct{}{}

	for _, query := range rc.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		case qbtypes.QueryBuilderFormula:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		case qbtypes.ClickHouseQuery:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		case qbtypes.PromQuery:
			if !spec.Disabled {
				queryNames[spec.Name] = struct{}{}
			}
		}
	}

	// The following logic exists for backward compatibility
	// If there is no selected query, then
	// - check if F1 is present, if yes, return F1
	// - else return the query with max ascii value
	if _, ok := queryNames["F1"]; ok {
		return "F1"
	}
	keys := make([]string, 0, len(queryNames))
	for k := range queryNames {
		keys = append(keys, k)
	}
	if len(keys) == 0 {
		return ""
	}
	sort.Strings(keys)
	return keys[len(keys)-1]
}

// ShouldEval checks if the further series should be evaluated at all for alerts.
func (rc *RuleCondition) ShouldEval(series *qbtypes.TimeSeries) bool {
	return !rc.RequireMinPoints || len(series.Values) >= rc.RequiredNumPoints
}

// QueryType is a shorthand method to get query type.
func (rc *RuleCondition) QueryType() QueryType {
	return rc.CompositeQuery.QueryType
}

func (rc *RuleCondition) String() string {
	data, _ := json.Marshal(*rc)
	return string(data)
}
