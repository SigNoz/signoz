package ruletypes

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"
	"unicode/utf8"

	"github.com/prometheus/alertmanager/config"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

// PostableRule is used to create alerting rule from HTTP api.
type PostableRule struct {
	AlertName   string              `json:"alert"`
	AlertType   AlertType           `json:"alertType,omitempty"`
	Description string              `json:"description,omitempty"`
	RuleType    RuleType            `json:"ruleType,omitempty"`
	EvalWindow  valuer.TextDuration `json:"evalWindow,omitempty"`
	Frequency   valuer.TextDuration `json:"frequency,omitempty"`

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
	// NewGroupEvalDelay is the grace period for new series to be excluded from alerts evaluation
	NewGroupEvalDelay valuer.TextDuration `json:"newGroupEvalDelay,omitzero"`
}

type Renotify struct {
	Enabled          bool                `json:"enabled"`
	ReNotifyInterval valuer.TextDuration `json:"interval,omitzero"`
	AlertStates      []AlertState        `json:"alertStates,omitempty"`
}

func (ns *NotificationSettings) GetAlertManagerNotificationConfig() alertmanagertypes.NotificationConfig {
	var renotifyInterval time.Duration
	var noDataRenotifyInterval time.Duration
	if ns.Renotify.Enabled {
		if slices.Contains(ns.Renotify.AlertStates, StateNoData) {
			noDataRenotifyInterval = ns.Renotify.ReNotifyInterval.Duration()
		}
		if slices.Contains(ns.Renotify.AlertStates, StateFiring) {
			renotifyInterval = ns.Renotify.ReNotifyInterval.Duration()
		}
	} else {
		renotifyInterval = 8760 * time.Hour //1 year for no renotify substitute
		noDataRenotifyInterval = 8760 * time.Hour
	}
	return alertmanagertypes.NewNotificationConfig(ns.GroupBy, renotifyInterval, noDataRenotifyInterval, ns.UsePolicy)
}

func (r *PostableRule) GetRuleRouteRequest(ruleID string) ([]*alertmanagertypes.PostableRoutePolicy, error) {
	threshold, err := r.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil, err
	}
	receivers := threshold.GetRuleReceivers()
	routeRequests := make([]*alertmanagertypes.PostableRoutePolicy, 0)
	for _, receiver := range receivers {
		expression := fmt.Sprintf(`%s == "%s" && %s == "%s"`, LabelThresholdName, receiver.Name, LabelRuleID, ruleID)
		routeRequests = append(routeRequests, &alertmanagertypes.PostableRoutePolicy{
			Expression:     expression,
			ExpressionKind: alertmanagertypes.RuleBasedExpression,
			Channels:       receiver.Channels,
			Name:           ruleID,
			Description:    fmt.Sprintf("Auto-generated route for rule %s", ruleID),
			Tags:           []string{"auto-generated", "rule-based"},
		})
	}
	return routeRequests, nil
}

func (r *PostableRule) GetInhibitRules(ruleID string) ([]config.InhibitRule, error) {
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
					Name:  LabelRuleID,
					Value: ruleID,
				},
			},
			TargetMatchers: config.Matchers{
				{
					Name:  LabelThresholdName,
					Value: receivers[i+1].Name,
				},
				{
					Name:  LabelRuleID,
					Value: ruleID,
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
		if state != StateFiring && state != StateNoData {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid alert state: %s", state)

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

	if r.EvalWindow.IsZero() {
		r.EvalWindow = valuer.MustParseTextDuration("5m")
	}

	if r.Frequency.IsZero() {
		r.Frequency = valuer.MustParseTextDuration("1m")
	}

	if r.RuleCondition != nil {
		switch r.RuleCondition.CompositeQuery.QueryType {
		case QueryTypeBuilder:
			if r.RuleType.IsZero() {
				r.RuleType = RuleTypeThreshold
			}
		case QueryTypePromQL:
			r.RuleType = RuleTypeProm
		}

		if r.SchemaVersion == DefaultSchemaVersion {
			thresholdName := CriticalThresholdName
			if r.Labels != nil {
				if severity, ok := r.Labels["severity"]; ok {
					thresholdName = severity
				}
			}

			// For anomaly detection with ValueIsBelow, negate the target
			targetValue := r.RuleCondition.Target
			if r.RuleType == RuleTypeAnomaly && r.RuleCondition.CompareOperator == ValueIsBelow && targetValue != nil {
				negated := -1 * *targetValue
				targetValue = &negated
			}

			thresholdData := RuleThresholdData{
				Kind: BasicThresholdKind,
				Spec: BasicRuleThresholds{{
					Name:            thresholdName,
					TargetUnit:      r.RuleCondition.TargetUnit,
					TargetValue:     targetValue,
					MatchType:       r.RuleCondition.MatchType,
					CompareOperator: r.RuleCondition.CompareOperator,
					Channels:        r.PreferredChannels,
				}},
			}
			r.RuleCondition.Thresholds = &thresholdData
			r.Evaluation = &EvaluationEnvelope{RollingEvaluation, RollingWindow{EvalWindow: r.EvalWindow, Frequency: r.Frequency}}
			r.NotificationSettings = &NotificationSettings{
				Renotify: Renotify{
					Enabled:          true,
					ReNotifyInterval: valuer.MustParseTextDuration("4h"),
					AlertStates:      []AlertState{StateFiring},
				},
			}
			if r.RuleCondition.AlertOnAbsent {
				r.NotificationSettings.Renotify.AlertStates = append(r.NotificationSettings.Renotify.AlertStates, StateNoData)
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
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse json: %v", err)
	}
	r.processRuleDefaults()
	return r.validate()
}

func isValidLabelName(ln string) bool {
	if len(ln) == 0 {
		return false
	}
	for i, b := range ln {
		if !((b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || b == '_' || b == '.' || (b >= '0' && b <= '9' && i > 0)) { //nolint:staticcheck // QF1001: De Morgan form is less readable here
			return false
		}
	}
	return true
}

func isValidLabelValue(v string) bool {
	return utf8.ValidString(v)
}

func (r *PostableRule) validate() error {

	var errs []error

	if r.RuleCondition == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "rule condition is required")
	}

	if r.Version != "v5" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "only version v5 is supported, got %q", r.Version))
	}

	for k, v := range r.Labels {
		if !isValidLabelName(k) {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid label name: %s", k))
		}

		if !isValidLabelValue(v) {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid label value: %s", v))
		}
	}

	for k := range r.Annotations {
		if !isValidLabelName(k) {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid annotation name: %s", k))
		}
	}

	errs = append(errs, testTemplateParsing(r)...)
	return errors.Join(errs...)
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
			nil,
		)
		return tmpl.ParseTest()
	}

	// Parsing Labels.
	for _, val := range rl.Labels {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "template parsing error: %s", err.Error()))
		}
	}

	// Parsing Annotations.
	for _, val := range rl.Annotations {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "template parsing error: %s", err.Error()))
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
	Id    string     `json:"id"`
	State AlertState `json:"state"`
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
