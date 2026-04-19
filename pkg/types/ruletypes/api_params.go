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
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type AlertType string

const (
	AlertTypeMetric     AlertType = "METRIC_BASED_ALERT"
	AlertTypeTraces     AlertType = "TRACES_BASED_ALERT"
	AlertTypeLogs       AlertType = "LOGS_BASED_ALERT"
	AlertTypeExceptions AlertType = "EXCEPTIONS_BASED_ALERT"
)

// Enum implements jsonschema.Enum; returns the acceptable values for AlertType.
func (AlertType) Enum() []any {
	return []any{
		AlertTypeMetric,
		AlertTypeTraces,
		AlertTypeLogs,
		AlertTypeExceptions,
	}
}

const (
	DefaultSchemaVersion  = "v1"
	SchemaVersionV2Alpha1 = "v2alpha1"
)

type RuleDataKind string

const (
	RuleDataKindJson RuleDataKind = "json"
)

// PostableRule is used to create alerting rule from HTTP api.
type PostableRule struct {
	AlertName   string              `json:"alert" required:"true"`
	AlertType   AlertType           `json:"alertType,omitempty"`
	Description string              `json:"description,omitempty"`
	RuleType    RuleType            `json:"ruleType,omitzero" required:"true"`
	EvalWindow  valuer.TextDuration `json:"evalWindow,omitzero"`
	Frequency   valuer.TextDuration `json:"frequency,omitzero"`

	RuleCondition *RuleCondition    `json:"condition,omitempty" required:"true"`
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
	Renotify  Renotify `json:"renotify,omitzero"`
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

// Channels returns all unique channel names referenced by the rule's thresholds.
func (r *PostableRule) Channels() []string {
	if r.RuleCondition == nil || r.RuleCondition.Thresholds == nil {
		return nil
	}
	threshold, err := r.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil
	}
	seen := make(map[string]struct{})
	var channels []string
	for _, receiver := range threshold.GetRuleReceivers() {
		for _, ch := range receiver.Channels {
			if _, ok := seen[ch]; !ok {
				seen[ch] = struct{}{}
				channels = append(channels, ch)
			}
		}
	}
	return channels
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

	// v2alpha1 uses the Evaluation envelope for window/frequency;
	// only default top-level fields for v1.
	if r.SchemaVersion != SchemaVersionV2Alpha1 {
		if r.EvalWindow.IsZero() {
			r.EvalWindow = valuer.MustParseTextDuration("5m")
		}

		if r.Frequency.IsZero() {
			r.Frequency = valuer.MustParseTextDuration("1m")
		}
	}

	if r.RuleCondition != nil && r.RuleCondition.CompositeQuery != nil {
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
	case SchemaVersionV2Alpha1:
		copyStruct := *r
		aux := Alias(copyStruct)
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

// validate runs during UnmarshalJSON (read + write path).
// Preserves the original pre-existing checks only so that stored rules
// continue to load without errors.
func (r *PostableRule) validate() error {
	var errs []error

	if r.RuleCondition == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition: field is required")
	}

	if r.Version != "v5" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "version: only v5 is supported, got %q", r.Version))
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

	joined := errors.Join(errs...)
	if joined != nil {
		return errors.WrapInvalidInputf(joined, errors.CodeInvalidInput, "validation failed")
	}
	return nil
}

// Validate enforces all validation rules. For now, this is invoked on the write path
// (create, update, patch, test) before persisting. This is intentionally
// not called from UnmarshalJSON so that existing stored rules can always
// be loaded regardless of new validation rules.
func (r *PostableRule) Validate() error {
	var errs []error

	if r.AlertName == "" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "alert: field is required"))
	}

	if r.RuleCondition == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition: field is required")
	}

	if r.Version != "v5" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "version: only v5 is supported, got %q", r.Version))
	}

	if r.AlertType != "" {
		switch r.AlertType {
		case AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions:
		default:
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"alertType: unsupported value %q; must be one of %q, %q, %q, %q",
				r.AlertType, AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions))
		}
	}

	if !r.RuleType.IsZero() {
		if err := r.RuleType.Validate(); err != nil {
			errs = append(errs, err)
		}
	}

	if r.RuleType == RuleTypeAnomaly && !r.RuleCondition.Seasonality.IsZero() {
		if err := r.RuleCondition.Seasonality.Validate(); err != nil {
			errs = append(errs, err)
		}
	}

	if r.RuleCondition.CompositeQuery == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.compositeQuery: field is required"))
	} else {
		if len(r.RuleCondition.CompositeQuery.Queries) == 0 {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.compositeQuery.queries: must have at least one query"))
		} else {
			cq := &qbtypes.CompositeQuery{Queries: r.RuleCondition.CompositeQuery.Queries}
			if err := cq.Validate(qbtypes.GetValidationOptions(qbtypes.RequestTypeTimeSeries)...); err != nil {
				errs = append(errs, err)
			}
		}
	}

	if r.RuleCondition.SelectedQuery != "" && r.RuleCondition.CompositeQuery != nil && len(r.RuleCondition.CompositeQuery.Queries) > 0 {
		found := false
		for _, query := range r.RuleCondition.CompositeQuery.Queries {
			if query.GetQueryName() == r.RuleCondition.SelectedQuery {
				found = true
				break
			}
		}
		if !found {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"condition.selectedQueryName: %q does not match any query in compositeQuery",
				r.RuleCondition.SelectedQuery))
		}
	}

	if r.RuleCondition.RequireMinPoints && r.RuleCondition.RequiredNumPoints <= 0 {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.requiredNumPoints: must be greater than 0 when requireMinPoints is enabled"))
	}

	errs = append(errs, r.validateSchemaVersion()...)

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

	joined := errors.Join(errs...)
	if joined != nil {
		return errors.WrapInvalidInputf(joined, errors.CodeInvalidInput, "validation failed")
	}
	return nil
}

func (r *PostableRule) validateSchemaVersion() []error {
	switch r.SchemaVersion {
	case DefaultSchemaVersion:
		return r.validateV1()
	case SchemaVersionV2Alpha1:
		return r.validateV2Alpha1()
	default:
		return []error{errors.NewInvalidInputf(errors.CodeInvalidInput,
			"schemaVersion: unsupported value %q; must be one of %q, %q",
			r.SchemaVersion, DefaultSchemaVersion, SchemaVersionV2Alpha1)}
	}
}

func (r *PostableRule) validateV1() []error {
	var errs []error

	if r.RuleCondition.Target == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.target: field is required for schemaVersion %q", DefaultSchemaVersion))
	}
	if r.RuleCondition.CompareOperator.IsZero() {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.op: field is required for schemaVersion %q", DefaultSchemaVersion))
	} else if err := r.RuleCondition.CompareOperator.Validate(); err != nil {
		errs = append(errs, err)
	}
	if r.RuleCondition.MatchType.IsZero() {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.matchType: field is required for schemaVersion %q", DefaultSchemaVersion))
	} else if err := r.RuleCondition.MatchType.Validate(); err != nil {
		errs = append(errs, err)
	}

	return errs
}

func (r *PostableRule) validateV2Alpha1() []error {
	var errs []error

	// TODO(srikanthccv): reject v1-only fields?
	// if r.RuleCondition.Target != nil {
	// 	errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
	// 		"condition.target: field is not used in schemaVersion %q; set target in condition.thresholds entries instead",
	// 		SchemaVersionV2Alpha1))
	// }
	// if !r.RuleCondition.CompareOperator.IsZero() {
	// 	errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
	// 		"condition.op: field is not used in schemaVersion %q; set op in condition.thresholds entries instead",
	// 		SchemaVersionV2Alpha1))
	// }
	// if !r.RuleCondition.MatchType.IsZero() {
	// 	errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
	// 		"condition.matchType: field is not used in schemaVersion %q; set matchType in condition.thresholds entries instead",
	// 		SchemaVersionV2Alpha1))
	// }
	// if len(r.PreferredChannels) > 0 {
	// 	errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
	// 		"preferredChannels: field is not used in schemaVersion %q; set channels in condition.thresholds entries instead",
	// 		SchemaVersionV2Alpha1))
	// }

	// Require v2alpha1-specific fields
	if r.RuleCondition.Thresholds == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"condition.thresholds: field is required for schemaVersion %q", SchemaVersionV2Alpha1))
	}

	if r.Evaluation == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"evaluation: field is required for schemaVersion %q", SchemaVersionV2Alpha1))
	}
	if r.NotificationSettings == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"notificationSettings: field is required for schemaVersion %q", SchemaVersionV2Alpha1))
	} else {
		if r.NotificationSettings.Renotify.Enabled && !r.NotificationSettings.Renotify.ReNotifyInterval.IsPositive() {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"notificationSettings.renotify.interval: must be a positive duration when renotify is enabled"))
		}
	}

	return errs
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
type GettableTestRule struct {
	AlertCount int    `json:"alertCount"`
	Message    string `json:"message"`
}

type GettableRules struct {
	Rules []*GettableRule `json:"rules"`
}

// GettableRule has info for an alerting rules.
type GettableRule struct {
	Id    string     `json:"id" required:"true"`
	State AlertState `json:"state" required:"true"`
	PostableRule
	CreatedAt time.Time `json:"createAt" required:"true"`
	CreatedBy *string   `json:"createBy" nullable:"true"`
	UpdatedAt time.Time `json:"updateAt" required:"true"`
	UpdatedBy *string   `json:"updateBy" nullable:"true"`
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
	case SchemaVersionV2Alpha1:
		copyStruct := *g
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	default:
		copyStruct := *g
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	}
}

// Rule is the v2 API read model for an alerting rule. It aligns audit fields
// with the canonical types.TimeAuditable / types.UserAuditable shape used by
// PlannedMaintenance and other entities. v1 handlers keep serializing
// GettableRule directly for back-compat with existing SDK / Terraform clients.
type Rule struct {
	Id    string     `json:"id" required:"true"`
	State AlertState `json:"state" required:"true"`
	PostableRule
	types.TimeAuditable
	types.UserAuditable
}

func NewRule(g *GettableRule) *Rule {
	r := &Rule{
		Id:           g.Id,
		State:        g.State,
		PostableRule: g.PostableRule,
	}
	r.CreatedAt = g.CreatedAt
	r.UpdatedAt = g.UpdatedAt
	if g.CreatedBy != nil {
		r.CreatedBy = *g.CreatedBy
	}
	if g.UpdatedBy != nil {
		r.UpdatedBy = *g.UpdatedBy
	}
	return r
}

func (r *Rule) MarshalJSON() ([]byte, error) {
	type Alias Rule

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
	case SchemaVersionV2Alpha1:
		copyStruct := *r
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	default:
		copyStruct := *r
		aux := Alias(copyStruct)
		return json.Marshal(aux)
	}
}
