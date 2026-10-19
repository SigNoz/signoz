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
	SchemaVersionV2Alpha1 = "v2alpha1"
)

type RuleDataKind string

const (
	RuleDataKindJson RuleDataKind = "json"
)

// PostableRule is used to create alerting rule from HTTP api.
type PostableRule struct {
	AlertName   valuer.DisplayName `json:"alert" required:"true"`
	AlertType   AlertType          `json:"alertType" required:"true"`
	Description string             `json:"description,omitempty"`
	RuleType    RuleType           `json:"ruleType" required:"true"`

	RuleCondition *RuleCondition    `json:"condition" required:"true"`
	Labels        map[string]string `json:"labels,omitempty"`
	Annotations   map[string]string `json:"annotations,omitempty"`

	Disabled bool `json:"disabled"`

	// Source captures the source url where rule has been created
	Source string `json:"source,omitempty"`

	Version string `json:"version"`

	Evaluation    *EvaluationEnvelope `json:"evaluation" required:"true"`
	SchemaVersion string              `json:"schemaVersion" required:"true" enum:"v2alpha1"`

	NotificationSettings *NotificationSettings `json:"notificationSettings" required:"true"`
}

type NotificationSettings struct {
	GroupBy   []string  `json:"groupBy,omitzero"`
	Renotify  *Renotify `json:"renotify,omitempty"`
	UsePolicy bool      `json:"usePolicy"`
	// NewGroupEvalDelay is the grace period for new series to be excluded from alerts evaluation
	NewGroupEvalDelay valuer.TextDuration `json:"newGroupEvalDelay,omitzero"`
}

type Renotify struct {
	Enabled          bool                `json:"enabled"`
	ReNotifyInterval valuer.TextDuration `json:"interval,omitzero"`
	AlertStates      []AlertState        `json:"alertStates,omitzero"`
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
	// TODO(srikanthccv): remove as this is now a legacy field
	if r.Version == "" {
		r.Version = "v5"
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

	switch r.AlertType {
	case AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions, AlertTypeAITraces:
	case "":
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "alertType: field is required"))
	default:
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"alertType: unsupported value %q; must be one of %q, %q, %q, %q, %q",
			r.AlertType, AlertTypeMetric, AlertTypeTraces, AlertTypeLogs, AlertTypeExceptions, AlertTypeAITraces))
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
		if err := r.RuleCondition.CompositeQuery.QueryType.Validate(); err != nil {
			errs = append(errs, err)
		}
		if err := r.RuleCondition.CompositeQuery.PanelType.Validate(); err != nil {
			errs = append(errs, err)
		}
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
	case SchemaVersionV2Alpha1:
		return r.validateV2Alpha1()
	default:
		return []error{errors.NewInvalidInputf(errors.CodeInvalidInput,
			"schemaVersion: unsupported value %q; must be %q",
			r.SchemaVersion, SchemaVersionV2Alpha1)}
	}
}

func (r *PostableRule) validateV2Alpha1() []error {
	var errs []error

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
