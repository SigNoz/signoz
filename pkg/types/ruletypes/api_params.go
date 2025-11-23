package ruletypes

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"
	"unicode/utf8"

	signozError "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"

	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"

	"github.com/prometheus/alertmanager/config"
)

type AlertType string

const (
	AlertTypeMetric     AlertType = "METRIC_BASED_ALERT"
	AlertTypeTraces     AlertType = "TRACES_BASED_ALERT"
	AlertTypeLogs       AlertType = "LOGS_BASED_ALERT"
	AlertTypeExceptions AlertType = "EXCEPTIONS_BASED_ALERT"
)

const (
	DefaultSchemaVersion = "v1"
)

type RuleDataKind string

const (
	RuleDataKindJson RuleDataKind = "json"
)

// PostableRule is used to create alerting rule from HTTP api
type PostableRule struct {
	AlertName   string    `json:"alert,omitempty"`
	AlertType   AlertType `json:"alertType,omitempty"`
	Description string    `json:"description,omitempty"`
	RuleType    RuleType  `json:"ruleType,omitempty"`
	EvalWindow  Duration  `json:"evalWindow,omitempty"`
	Frequency   Duration  `json:"frequency,omitempty"`

	RuleCondition *RuleCondition    `json:"condition,omitempty"`
	Labels        map[string]string `json:"labels,omitempty"`
	Annotations   map[string]string `json:"annotations,omitempty"`

	Disabled bool `json:"disabled"`

	// Source captures the source url where rule has been created
	Source string `json:"source,omitempty"`

	PreferredChannels []string `json:"preferredChannels,omitempty"`

	Version string `json:"version,omitempty"`

	Evaluation    *EvaluationEnvelope `yaml:"evaluation,omitempty" json:"evaluation,omitempty"`
	SchemaVersion string              `json:"schemaVersion,omitempty"`

	NotificationSettings *NotificationSettings `json:"notificationSettings,omitempty"`
}

type NotificationSettings struct {
	GroupBy   []string `json:"groupBy,omitempty"`
	Renotify  Renotify `json:"renotify,omitempty"`
	UsePolicy bool     `json:"usePolicy,omitempty"`
}

type Renotify struct {
	Enabled          bool               `json:"enabled"`
	ReNotifyInterval Duration           `json:"interval,omitempty"`
	AlertStates      []model.AlertState `json:"alertStates,omitempty"`
}

func (ns *NotificationSettings) GetAlertManagerNotificationConfig() alertmanagertypes.NotificationConfig {
	var renotifyInterval time.Duration
	var noDataRenotifyInterval time.Duration
	if ns.Renotify.Enabled {
		if slices.Contains(ns.Renotify.AlertStates, model.StateNoData) {
			noDataRenotifyInterval = time.Duration(ns.Renotify.ReNotifyInterval)
		}
		if slices.Contains(ns.Renotify.AlertStates, model.StateFiring) {
			renotifyInterval = time.Duration(ns.Renotify.ReNotifyInterval)
		}
	} else {
		renotifyInterval = 8760 * time.Hour //1 year for no renotify substitute
		noDataRenotifyInterval = 8760 * time.Hour
	}
	return alertmanagertypes.NewNotificationConfig(ns.GroupBy, renotifyInterval, noDataRenotifyInterval, ns.UsePolicy)
}

func (r *PostableRule) GetRuleRouteRequest(ruleId string) ([]*alertmanagertypes.PostableRoutePolicy, error) {
	threshold, err := r.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil, err
	}
	receivers := threshold.GetRuleReceivers()
	routeRequests := make([]*alertmanagertypes.PostableRoutePolicy, 0)
	for _, receiver := range receivers {
		expression := fmt.Sprintf(`%s == "%s" && %s == "%s"`, LabelThresholdName, receiver.Name, LabelRuleId, ruleId)
		routeRequests = append(routeRequests, &alertmanagertypes.PostableRoutePolicy{
			Expression:     expression,
			ExpressionKind: alertmanagertypes.RuleBasedExpression,
			Channels:       receiver.Channels,
			Name:           ruleId,
			Description:    fmt.Sprintf("Auto-generated route for rule %s", ruleId),
			Tags:           []string{"auto-generated", "rule-based"},
		})
	}
	return routeRequests, nil
}

func (r *PostableRule) GetInhibitRules(ruleId string) ([]config.InhibitRule, error) {
	threshold, err := r.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil, err
	}
	var groups []string
	if r.NotificationSettings != nil {
		for k := range r.NotificationSettings.GetAlertManagerNotificationConfig().NotificationGroup {
			groups = append(groups, string(k))
		}
	}
	receivers := threshold.GetRuleReceivers()
	var inhibitRules []config.InhibitRule
	for i := 0; i < len(receivers)-1; i++ {
		rule := config.InhibitRule{
			SourceMatchers: config.Matchers{
				{
					Name:  LabelThresholdName,
					Value: receivers[i].Name,
				},
				{
					Name:  LabelRuleId,
					Value: ruleId,
				},
			},
			TargetMatchers: config.Matchers{
				{
					Name:  LabelThresholdName,
					Value: receivers[i+1].Name,
				},
				{
					Name:  LabelRuleId,
					Value: ruleId,
				},
			},
			Equal: groups,
		}
		inhibitRules = append(inhibitRules, rule)
	}
	return inhibitRules, nil
}

func (ns *NotificationSettings) UnmarshalJSON(data []byte) error {
	type Alias NotificationSettings
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(ns),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Validate states after unmarshaling
	for _, state := range ns.Renotify.AlertStates {
		if state != model.StateFiring && state != model.StateNoData {
			return signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid alert state: %s", state)

		}
	}
	return nil
}

// processRuleDefaults applies the default values
// for the rule options that are blank or unset.
func (r *PostableRule) processRuleDefaults() {

	if r.SchemaVersion == "" {
		r.SchemaVersion = DefaultSchemaVersion
	}

	if r.EvalWindow == 0 {
		r.EvalWindow = Duration(5 * time.Minute)
	}

	if r.Frequency == 0 {
		r.Frequency = Duration(1 * time.Minute)
	}

	if r.RuleCondition != nil {
		switch r.RuleCondition.CompositeQuery.QueryType {
		case v3.QueryTypeBuilder:
			if r.RuleType == "" {
				r.RuleType = RuleTypeThreshold
			}
		case v3.QueryTypePromQL:
			r.RuleType = RuleTypeProm
		}

		for qLabel, q := range r.RuleCondition.CompositeQuery.BuilderQueries {
			if q.AggregateAttribute.Key != "" && q.Expression == "" {
				q.Expression = qLabel
			}
		}

		//added alerts v2 fields
		if r.SchemaVersion == DefaultSchemaVersion {
			thresholdName := CriticalThresholdName
			if r.Labels != nil {
				if severity, ok := r.Labels["severity"]; ok {
					thresholdName = severity
				}
			}

			// For anomaly detection with ValueIsBelow, negate the target
			targetValue := r.RuleCondition.Target
			if r.RuleType == RuleTypeAnomaly && r.RuleCondition.CompareOp == ValueIsBelow && targetValue != nil {
				negated := -1 * *targetValue
				targetValue = &negated
			}

			thresholdData := RuleThresholdData{
				Kind: BasicThresholdKind,
				Spec: BasicRuleThresholds{{
					Name:        thresholdName,
					TargetUnit:  r.RuleCondition.TargetUnit,
					TargetValue: targetValue,
					MatchType:   r.RuleCondition.MatchType,
					CompareOp:   r.RuleCondition.CompareOp,
					Channels:    r.PreferredChannels,
				}},
			}
			r.RuleCondition.Thresholds = &thresholdData
			r.Evaluation = &EvaluationEnvelope{RollingEvaluation, RollingWindow{EvalWindow: r.EvalWindow, Frequency: r.Frequency}}
			r.NotificationSettings = &NotificationSettings{
				Renotify: Renotify{
					Enabled:          true,
					ReNotifyInterval: Duration(4 * time.Hour),
					AlertStates:      []model.AlertState{model.StateFiring},
				},
			}
			if r.RuleCondition.AlertOnAbsent {
				r.NotificationSettings.Renotify.AlertStates = append(r.NotificationSettings.Renotify.AlertStates, model.StateNoData)
			}
		}
	}
}

func (r *PostableRule) MarshalJSON() ([]byte, error) {
	type Alias PostableRule

	switch r.SchemaVersion {
	case DefaultSchemaVersion:
		copyStruct := *r
		aux := Alias(copyStruct)
		if aux.RuleCondition != nil {
			aux.RuleCondition.Thresholds = nil
		}
		aux.Evaluation = nil
		aux.SchemaVersion = ""
		aux.NotificationSettings = nil
		return json.Marshal(aux)
	default:
		copyStruct := *r
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	}
}

func (r *PostableRule) UnmarshalJSON(bytes []byte) error {
	type Alias PostableRule
	aux := (*Alias)(r)
	if err := json.Unmarshal(bytes, aux); err != nil {
		return signozError.NewInvalidInputf(signozError.CodeInvalidInput, "failed to parse json: %v", err)
	}
	r.processRuleDefaults()
	return r.validate()
}

func isValidLabelName(ln string) bool {
	if len(ln) == 0 {
		return false
	}
	for i, b := range ln {
		if !((b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || b == '_' || b == '.' || (b >= '0' && b <= '9' && i > 0)) {
			return false
		}
	}
	return true
}

func isValidLabelValue(v string) bool {
	return utf8.ValidString(v)
}

func isAllQueriesDisabled(compositeQuery *v3.CompositeQuery) bool {
	if compositeQuery == nil {
		return false
	}
	if compositeQuery.BuilderQueries == nil && compositeQuery.PromQueries == nil && compositeQuery.ClickHouseQueries == nil {
		return false
	}
	switch compositeQuery.QueryType {
	case v3.QueryTypeBuilder:
		if len(compositeQuery.BuilderQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.BuilderQueries {
			if !query.Disabled {
				return false
			}
		}
	case v3.QueryTypePromQL:
		if len(compositeQuery.PromQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.PromQueries {
			if !query.Disabled {
				return false
			}
		}
	case v3.QueryTypeClickHouseSQL:
		if len(compositeQuery.ClickHouseQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.ClickHouseQueries {
			if !query.Disabled {
				return false
			}
		}
	}
	return true
}

func (r *PostableRule) validate() error {

	var errs []error

	if r.RuleCondition == nil {
		// will get panic if we try to access CompositeQuery, so return here
		return signozError.NewInvalidInputf(signozError.CodeInvalidInput, "rule condition is required")
	}
	if r.RuleCondition.CompositeQuery == nil {
		errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "composite query is required"))
	}

	if isAllQueriesDisabled(r.RuleCondition.CompositeQuery) {
		errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "all queries are disabled in rule condition"))
	}

	for k, v := range r.Labels {
		if !isValidLabelName(k) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid label name: %s", k))
		}

		if !isValidLabelValue(v) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid label value: %s", v))
		}
	}

	for k := range r.Annotations {
		if !isValidLabelName(k) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid annotation name: %s", k))
		}
	}

	errs = append(errs, testTemplateParsing(r)...)
	return signozError.Join(errs...)
}

func testTemplateParsing(rl *PostableRule) (errs []error) {
	if rl.AlertName == "" {
		// Not an alerting rule.
		return errs
	}

	// Trying to parse templates.
	tmplData := AlertTemplateData(make(map[string]string), "0", "0")
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	parseTest := func(text string) error {
		tmpl := NewTemplateExpander(
			context.TODO(),
			defs+text,
			"__alert_"+rl.AlertName,
			tmplData,
			times.Time(timestamp.FromTime(time.Now())),
			nil,
		)
		return tmpl.ParseTest()
	}

	// Parsing Labels.
	for _, val := range rl.Labels {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "template parsing error: %s", err.Error()))
		}
	}

	// Parsing Annotations.
	for _, val := range rl.Annotations {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "template parsing error: %s", err.Error()))
		}
	}

	return errs
}

// GettableRules has info for all stored rules.
type GettableRules struct {
	Rules []*GettableRule `json:"rules"`
}

// GettableRule has info for an alerting rules.
type GettableRule struct {
	Id    string           `json:"id"`
	State model.AlertState `json:"state"`
	PostableRule
	CreatedAt *time.Time `json:"createAt"`
	CreatedBy *string    `json:"createBy"`
	UpdatedAt *time.Time `json:"updateAt"`
	UpdatedBy *string    `json:"updateBy"`
}

func (g *GettableRule) MarshalJSON() ([]byte, error) {
	type Alias GettableRule

	switch g.SchemaVersion {
	case DefaultSchemaVersion:
		copyStruct := *g
		aux := Alias(copyStruct)
		if aux.RuleCondition != nil {
			aux.RuleCondition.Thresholds = nil
		}
		aux.Evaluation = nil
		aux.SchemaVersion = ""
		aux.NotificationSettings = nil
		return json.Marshal(aux)
	default:
		copyStruct := *g
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	}
}
