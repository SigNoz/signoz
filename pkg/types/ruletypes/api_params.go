package ruletypes

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"
	"unicode/utf8"

	"github.com/prometheus/alertmanager/config"
	"github.com/swaggest/jsonschema-go"

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
	AlertTypeAITraces   AlertType = "AI_TRACES_BASED_ALERT"
)

// Enum implements jsonschema.Enum; returns the acceptable values for AlertType.
func (AlertType) Enum() []any {
	return []any{
		AlertTypeMetric,
		AlertTypeTraces,
		AlertTypeLogs,
		AlertTypeExceptions,
		AlertTypeAITraces,
	}
}

// BuilderQueryType returns the query type the alert type's builder queries
// carry; only AI trace alerts use builder_ai_query.
func (t AlertType) BuilderQueryType() qbtypes.QueryType {
	if t == AlertTypeAITraces {
		return qbtypes.QueryTypeBuilderAI
	}
	return qbtypes.QueryTypeBuilder
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
	AlertName   valuer.DisplayName  `json:"alert" required:"true" description:"The display name of the alert rule."`
	AlertType   AlertType           `json:"alertType" required:"true" description:"The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT."`
	Description string              `json:"description,omitempty" description:"A human readable description of what the rule monitors."`
	RuleType    RuleType            `json:"ruleType" required:"true" description:"The evaluation strategy: threshold_rule compares against thresholds, promql_rule evaluates a PromQL expression, anomaly_rule scores deviation from seasonal history. Defaults to threshold_rule for builder and clickhouse_sql queries and is forced to promql_rule for promql queries."`
	EvalWindow  valuer.TextDuration `json:"evalWindow,omitzero" description:"The lookback window as a Go duration such as 5m. Only read when schemaVersion is v1, defaulting to 5m; v2alpha1 rules set it in evaluation.spec instead."`
	Frequency   valuer.TextDuration `json:"frequency,omitzero" description:"How often the rule is evaluated, as a Go duration such as 1m. Only read when schemaVersion is v1, defaulting to 1m; v2alpha1 rules set it in evaluation.spec instead."`

	RuleCondition *RuleCondition    `json:"condition" required:"true" description:"The query to evaluate and the thresholds applied to its result."`
	Labels        map[string]string `json:"labels,omitempty" description:"Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. severity is the conventional routing label."`
	Annotations   map[string]string `json:"annotations,omitempty" description:"Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels."`

	Disabled bool `json:"disabled" description:"Whether the rule is paused. A disabled rule is neither evaluated nor notifies. Defaults to false."`

	Source string `json:"source,omitempty" description:"The URL of the page the rule was created from. Informational; it is not used for evaluation."`

	PreferredChannels []string `json:"preferredChannels,omitempty" description:"The displayName of each notification channel to notify, for schemaVersion v1 rules. Ignored for v2alpha1, where each threshold carries its own channels."`

	Version string `json:"version" description:"The query payload version. Nothing reads it."`

	Evaluation    *EvaluationEnvelope `json:"evaluation,omitempty" required:"true" description:"The evaluation window, as a kind and spec."`
	SchemaVersion string              `json:"schemaVersion,omitempty" required:"true" enum:"v2alpha1" description:"The rule payload schema."`

	NotificationSettings *NotificationSettings `json:"notificationSettings,omitempty" required:"true" description:"Grouping, re-notification and routing behaviour."`
}

type NotificationSettings struct {
	GroupBy           []string            `json:"groupBy,omitzero" description:"Label names whose values group alerts into one notification, such as service.name."`
	Renotify          *Renotify           `json:"renotify,omitempty" description:"Whether and how often to re-send a notification for an alert that stays active."`
	UsePolicy         bool                `json:"usePolicy" description:"When true, alerts are routed by the organisation level notification policies instead of the channels named on the thresholds. Defaults to false."`
	NewGroupEvalDelay valuer.TextDuration `json:"newGroupEvalDelay,omitzero" description:"A grace period, as a Go duration such as 2m, during which a newly seen label group is excluded from evaluation. Applies to metric rules only; log and trace rules are never delayed. A group whose values are not yet known is evaluated immediately."`
}

type Renotify struct {
	Enabled          bool                `json:"enabled" description:"Whether an active alert is re-sent after interval elapses. When false an alert notifies once per firing."`
	ReNotifyInterval valuer.TextDuration `json:"interval,omitzero" description:"The time between repeat notifications, as a Go duration such as 4h. Must be positive when enabled is true."`
	AlertStates      []AlertState        `json:"alertStates,omitzero" description:"The alert states that are re-notified: firing, nodata or both."`
}

func (ns *NotificationSettings) GetAlertManagerNotificationConfig() alertmanagertypes.NotificationConfig {
	var renotifyInterval time.Duration
	var noDataRenotifyInterval time.Duration
	if ns.Renotify != nil && ns.Renotify.Enabled {
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
	if ns.Renotify != nil {
		for _, state := range ns.Renotify.AlertStates {
			if state != StateFiring && state != StateNoData {
				return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid alert state: %s", state)

			}
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

	// TODO(srikanthccv): remove as this is now a legacy field
	if r.Version == "" {
		r.Version = "v5"
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
				Renotify: &Renotify{
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

var _ jsonschema.Preparer = PostableRule{}

// PrepareJSONSchema marks version and source deprecated: nothing reads them,
// they stay only so existing clients keep a stable schema.
func (PostableRule) PrepareJSONSchema(schema *jsonschema.Schema) error {
	for _, name := range []string{"version", "source"} {
		if property, ok := schema.Properties[name]; ok && property.TypeObject != nil {
			property.TypeObject.WithDeprecated(true)
		}
	}
	return nil
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
// TODO(srikanthccv): remove this once v1 is deprecated and removed.
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

	if len(errs) > 0 {
		messages := make([]string, len(errs))
		for i, e := range errs {
			messages[i] = e.Error()
		}
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "alert rule definition is not valid").
			WithAdditional(messages...)
	}
	return nil
}

// Validate enforces all validation rules. For now, this is invoked on the write path
// (create, update, patch, test) before persisting. This is intentionally
// not called from UnmarshalJSON so that existing stored rules can always
// be loaded regardless of new validation rules.
func (r *PostableRule) Validate() error {
	var errs []error

	if r.AlertName.IsZero() {
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
		case AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions, AlertTypeAITraces:
		default:
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"alertType: unsupported value %q; must be one of %q, %q, %q, %q, %q",
				r.AlertType, AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions, AlertTypeAITraces))
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

	if len(errs) > 0 {
		messages := make([]string, len(errs))
		for i, e := range errs {
			messages[i] = e.Error()
		}
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "alert rule is not valid").
			WithAdditional(messages...)
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
		if r.NotificationSettings.Renotify != nil && r.NotificationSettings.Renotify.Enabled && !r.NotificationSettings.Renotify.ReNotifyInterval.IsPositive() {
			errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"notificationSettings.renotify.interval: must be a positive duration when renotify is enabled"))
		}
	}

	return errs
}

func testTemplateParsing(rl *PostableRule) (errs []error) {
	if rl.AlertName.IsZero() {
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
			"__alert_"+rl.AlertName.StringValue(),
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
	AlertCount int    `json:"alertCount" description:"The number of alerts the test notification produced. Counts every evaluated series, including those that did not cross the threshold."`
	Message    string `json:"message" description:"A human readable summary of the test evaluation."`
}

type GettableRules struct {
	Rules []*GettableRule `json:"rules" description:"The rules."`
}

// GettableRule has info for an alerting rules.
type GettableRule struct {
	Id    string     `json:"id" required:"true" description:"The unique identifier of the rule."`
	State AlertState `json:"state" required:"true" description:"The current evaluation state: inactive, pending, recovering, firing, nodata or disabled."`
	PostableRule
	CreatedAt time.Time `json:"createAt" required:"true" description:"When the rule was created, in RFC 3339 format."`
	CreatedBy *string   `json:"createBy" nullable:"true" description:"The identifier of the user who created the rule."`
	UpdatedAt time.Time `json:"updateAt" required:"true" description:"When the rule was last updated, in RFC 3339 format."`
	UpdatedBy *string   `json:"updateBy" nullable:"true" description:"The identifier of the user who last updated the rule."`
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
	Id    string     `json:"id" required:"true" description:"The unique identifier of the rule."`
	State AlertState `json:"state" required:"true" description:"The current evaluation state: inactive, pending, recovering, firing, nodata or disabled."`
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
