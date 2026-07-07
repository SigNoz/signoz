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
	Queries []qbtypes.QueryEnvelope `json:"queries" required:"true"`

	PanelType PanelType `json:"panelType" required:"true"`
	QueryType QueryType `json:"queryType" required:"true"`
	// Unit for the time series data shown in the graph
	// This is used to format the value and threshold
	Unit string `json:"unit,omitempty"`
}

type RuleCondition struct {
	CompositeQuery    *AlertCompositeQuery `json:"compositeQuery" required:"true"`
	CompareOperator   CompareOperator      `json:"op,omitzero"`
	Target            *float64             `json:"target,omitempty"`
	AlertOnAbsent     bool                 `json:"alertOnAbsent,omitempty"`
	AbsentFor         uint64               `json:"absentFor,omitempty"`
	MatchType         MatchType            `json:"matchType,omitzero"`
	TargetUnit        string               `json:"targetUnit,omitempty"`
	Algorithm         string               `json:"algorithm,omitempty"`
	Seasonality       Seasonality          `json:"seasonality,omitzero"`
	SelectedQuery     string               `json:"selectedQueryName,omitempty"`
	RequireMinPoints  bool                 `json:"requireMinPoints,omitempty"`
	RequiredNumPoints int                  `json:"requiredNumPoints,omitempty"`
	Thresholds        *RuleThresholdData   `json:"thresholds,omitempty"`
}

func (rc *RuleCondition) SelectedQueryName() string {

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

