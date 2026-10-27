package sqlmigration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"maps"
	"slices"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

const (
	schemaVersionV2Alpha1  = "v2alpha1"
	ruleTypeThreshold      = "threshold_rule"
	ruleTypeProm           = "promql_rule"
	ruleTypeAnomaly        = "anomaly_rule"
	queryTypeBuilder       = "builder"
	queryTypePromQL        = "promql"
	queryTypeClickHouseSQL = "clickhouse_sql"
	panelTypeGraph         = "graph"
	alertTypeMetric        = "METRIC_BASED_ALERT"
	alertTypeTraces        = "TRACES_BASED_ALERT"
	alertTypeLogs          = "LOGS_BASED_ALERT"
	signalLogs             = "logs"
	signalTraces           = "traces"
	compareOperatorBelow   = "2"
	criticalThresholdName  = "critical"
	labelSeverity          = "severity"
)

// The values the write path accepts; a migrated rule outside them is written
// disabled, for the user to fix.
var (
	supportedCompareOperators = []string{"1", "above", ">", "2", "below", "<", "3", "equal", "eq", "=", "4", "not_equal", "not_eq", "!=", "5", "above_or_equal", "above_or_eq", ">=", "6", "below_or_equal", "below_or_eq", "<=", "7", "outside_bounds"}
	supportedMatchTypes       = []string{"1", "at_least_once", "2", "all_the_times", "3", "on_average", "avg", "4", "in_total", "sum", "5", "last"}
)

// The values the write path accepts; a migrated row outside them cannot be
// edited until the field is supplied, so the migration derives them.
var (
	supportedAlertTypes = []string{"METRIC_BASED_ALERT", "TRACES_BASED_ALERT", "LOGS_BASED_ALERT", "EXCEPTIONS_BASED_ALERT", "AI_TRACES_BASED_ALERT"}
	supportedQueryTypes = []string{"builder", "clickhouse_sql", "promql"}
	supportedPanelTypes = []string{"value", "table", "graph"}
)

type migrateRulesV1ToV2Alpha1 struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

func NewMigrateRulesV1ToV2Alpha1Factory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_rules_v1_to_v2alpha1"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &migrateRulesV1ToV2Alpha1{sqlstore: sqlstore, logger: ps.Logger}, nil
	})
}

func (migration *migrateRulesV1ToV2Alpha1) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up rewrites every v1 rule in every org as v2alpha1 in place. A row that does
// not decode, or a v1 rule that cannot be rewritten, is logged and left as is;
// a failed write aborts the run and rolls back every org.
func (migration *migrateRulesV1ToV2Alpha1) Up(ctx context.Context, _ *bun.DB) error {
	return migration.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		var orgIDs []string
		if err := migration.sqlstore.BunDBCtx(ctx).NewSelect().Table("organizations").Column("id").Scan(ctx, &orgIDs); err != nil {
			return err
		}

		for _, orgID := range orgIDs {
			if err := migration.convertOrg(ctx, orgID); err != nil {
				return err
			}
		}

		return nil
	})
}

func (migration *migrateRulesV1ToV2Alpha1) convertOrg(ctx context.Context, orgID string) error {
	db := migration.sqlstore.BunDBCtx(ctx)

	type ruleRow struct {
		bun.BaseModel `bun:"table:rule"`

		ID    string `bun:"id,pk"`
		OrgID string `bun:"org_id"`
		Data  string `bun:"data"`
	}

	allRules := make([]*ruleRow, 0)
	if err := db.NewSelect().Model(&allRules).Where("org_id = ?", orgID).Scan(ctx); err != nil {
		return err
	}

	allRoutePolicies := make([]*routePolicyRow, 0)
	if err := db.NewSelect().Model(&allRoutePolicies).Where("org_id = ?", orgID).Scan(ctx); err != nil {
		return err
	}
	// the name is not unique; a v1 rule has one threshold so one row, and any
	// duplicate is as good as another
	routePolicyNameToRoute := make(map[string]*routePolicyRow)
	for _, route := range allRoutePolicies {
		routePolicyNameToRoute[route.Name] = route
	}

	var migrated, disabled, skipped, undecodable, unmigratable int
	for _, storedRule := range allRules {
		storedRuleData := new(postableRule)
		if err := json.Unmarshal([]byte(storedRule.Data), storedRuleData); err != nil {
			undecodable++
			migration.logger.WarnContext(ctx, "failed to decode stored rule", slog.String("org_id", orgID), slog.String("rule_id", storedRule.ID), errors.Attr(err))
			continue
		}
		if storedRuleData.SchemaVersion == schemaVersionV2Alpha1 {
			skipped++
			continue
		}

		storedRoute := routePolicyNameToRoute[storedRule.ID]
		if err := validateRoute(storedRoute, storedRuleData.PreferredChannels); err != nil {
			unmigratable++
			migration.logger.WarnContext(ctx, "leaving rule at v1", slog.String("org_id", orgID), slog.String("rule_id", storedRule.ID), errors.Attr(err))
			continue
		}

		convertedRule, convertedRoute, err := convertRule(storedRule.ID, storedRuleData, storedRoute)
		if err != nil {
			unmigratable++
			migration.logger.WarnContext(ctx, "leaving rule at v1", slog.String("org_id", orgID), slog.String("rule_id", storedRule.ID), errors.Attr(err))
			continue
		}
		if cause := convertedRule.disableIfThresholdNeverFired(); cause != "" {
			disabled++
			migration.logger.WarnContext(ctx, "migrating rule as disabled, its threshold never fired in v1", slog.String("org_id", orgID), slog.String("rule_id", storedRule.ID), slog.String("cause", cause))
		}

		data, err := marshalUnescaped(convertedRule)
		if err != nil {
			return err
		}
		storedRule.Data = string(data)
		if _, err := db.NewUpdate().Model(storedRule).Column("data").WherePK().Exec(ctx); err != nil {
			return err
		}
		if convertedRoute != nil && convertedRoute.Expression != storedRoute.Expression {
			if _, err := db.NewUpdate().Model(convertedRoute).Column("expression").WherePK().Exec(ctx); err != nil {
				return err
			}
		}
		migrated++
	}

	migration.logger.InfoContext(ctx, "migrated rules from v1 to v2alpha1", slog.String("org_id", orgID), slog.Int("total", len(allRules)), slog.Int("migrated", migrated), slog.Int("disabled", disabled), slog.Int("skipped", skipped), slog.Int("undecodable", undecodable), slog.Int("unmigratable", unmigratable))
	return nil
}

// validateRoute checks the rule's route_policy row, named after the rule. A
// rule that never had channels got no row from migration 049 and migrates with
// none; a rule with preferred channels but no row would lose them, so it is
// left at v1.
func validateRoute(route *routePolicyRow, preferredChannels []string) error {
	if route == nil && len(preferredChannels) > 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "no route_policy row for a rule with %d preferred channels", len(preferredChannels))
	}
	return nil
}

// convertRule returns a v2alpha1 copy of storedRuleData, derived in the order
// the v1 decode derived the same values, with the rule's route_policy row as it
// must be stored alongside. Version and source are left as stored. A nil
// storedRoute is a rule that never had channels.
func convertRule(ruleID string, storedRuleData *postableRule, storedRoute *routePolicyRow) (*postableRule, *routePolicyRow, error) {
	if storedRuleData.RuleCondition == nil {
		return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "condition in stored rule data is null")
	}
	if storedRuleData.RuleCondition.CompositeQuery == nil {
		return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.compositeQuery in stored rule data is null")
	}
	channels := []string{}
	if storedRoute != nil {
		channels = storedRoute.Channels
	}

	rule := storedRuleData.clone()
	rule.fillDurationDefaults()
	if err := rule.validateDurations(); err != nil {
		return nil, nil, err
	}
	rule.deriveAlertType()
	rule.deriveQueryType()
	rule.repairPanelType()
	rule.disableUnmetMinPoints()
	rule.deriveRuleType()
	rule.negateAnomalyBelowTarget()
	convertedRoute := rule.repairEmptySeverity(ruleID, storedRoute)
	rule.relocateThreshold(channels)
	rule.relocateEvaluation()
	rule.synthesizeNotificationSettings()
	rule.SchemaVersion = schemaVersionV2Alpha1
	rule.clearV1Fields()

	return rule, convertedRoute, nil
}

type routePolicyRow struct {
	bun.BaseModel `bun:"table:route_policy"`

	ID         string   `bun:"id,pk"`
	OrgID      string   `bun:"org_id"`
	Name       string   `bun:"name"`
	Expression string   `bun:"expression"`
	Channels   []string `bun:"channels,type:jsonb"`
}

// postableRule mirrors PostableRule key for key, in its order. Keys the
// crosswalk reads or writes are typed; the rest pass through as stored.
type postableRule struct {
	AlertName            json.RawMessage       `json:"alert,omitempty"`
	AlertType            string                `json:"alertType"`
	Description          json.RawMessage       `json:"description,omitempty"`
	RuleType             string                `json:"ruleType,omitempty"`
	EvalWindow           textDuration          `json:"evalWindow,omitzero"`
	Frequency            textDuration          `json:"frequency,omitzero"`
	RuleCondition        *ruleCondition        `json:"condition"`
	Labels               map[string]string     `json:"labels,omitempty"`
	Annotations          json.RawMessage       `json:"annotations,omitempty"`
	Disabled             json.RawMessage       `json:"disabled,omitempty"`
	Source               json.RawMessage       `json:"source,omitempty"`
	PreferredChannels    []string              `json:"preferredChannels,omitempty"`
	Version              json.RawMessage       `json:"version,omitempty"`
	Evaluation           *evaluationEnvelope   `json:"evaluation,omitempty"`
	SchemaVersion        string                `json:"schemaVersion,omitempty"`
	NotificationSettings *notificationSettings `json:"notificationSettings,omitempty"`
}

type ruleCondition struct {
	CompositeQuery    *compositeQuery `json:"compositeQuery"`
	CompareOperator   string          `json:"op,omitempty"`
	Target            *float64        `json:"target,omitempty"`
	AlertOnAbsent     bool            `json:"alertOnAbsent,omitempty"`
	AbsentFor         json.RawMessage `json:"absentFor,omitempty"`
	MatchType         string          `json:"matchType,omitempty"`
	TargetUnit        string          `json:"targetUnit,omitempty"`
	Algorithm         json.RawMessage `json:"algorithm,omitempty"`
	Seasonality       string          `json:"seasonality,omitempty"`
	SelectedQuery     json.RawMessage `json:"selectedQueryName,omitempty"`
	RequireMinPoints  json.RawMessage `json:"requireMinPoints,omitempty"`
	RequiredNumPoints json.RawMessage `json:"requiredNumPoints,omitempty"`
	Thresholds        *ruleThresholds `json:"thresholds,omitempty"`
}

type compositeQuery struct {
	Queries   json.RawMessage `json:"queries,omitempty"`
	PanelType string          `json:"panelType"`
	QueryType string          `json:"queryType"`
	Unit      json.RawMessage `json:"unit,omitempty"`
}

// ruleQueryEnvelope reads the two envelope keys the derivations need.
type ruleQueryEnvelope struct {
	Type string `json:"type"`
	Spec struct {
		Signal string `json:"signal"`
	} `json:"spec"`
}

type ruleThresholds struct {
	Kind string           `json:"kind"`
	Spec []basicThreshold `json:"spec"`
}

type basicThreshold struct {
	Name            string   `json:"name"`
	TargetValue     *float64 `json:"target"`
	TargetUnit      string   `json:"targetUnit"`
	RecoveryTarget  *float64 `json:"recoveryTarget"`
	MatchType       string   `json:"matchType"`
	CompareOperator string   `json:"op"`
	Channels        []string `json:"channels"`
}

type evaluationEnvelope struct {
	Kind string        `json:"kind"`
	Spec rollingWindow `json:"spec"`
}

type rollingWindow struct {
	EvalWindow textDuration `json:"evalWindow"`
	Frequency  textDuration `json:"frequency"`
}

type notificationSettings struct {
	Renotify  *renotify `json:"renotify,omitempty"`
	UsePolicy bool      `json:"usePolicy"`
}

type renotify struct {
	Enabled          bool         `json:"enabled"`
	ReNotifyInterval textDuration `json:"interval,omitzero"`
	AlertStates      []string     `json:"alertStates,omitzero"`
}

// clone copies what the conversion writes to: the rule, its condition, the
// composite query and the labels. Raw keys share their bytes.
func (rule *postableRule) clone() *postableRule {
	cloned := *rule
	if rule.RuleCondition != nil {
		condition := *rule.RuleCondition
		if condition.CompositeQuery != nil {
			query := *condition.CompositeQuery
			condition.CompositeQuery = &query
		}
		cloned.RuleCondition = &condition
	}
	cloned.Labels = maps.Clone(rule.Labels)
	return &cloned
}

// disableIfThresholdNeverFired disables a rule whose threshold v1 stored but
// never fired on: a null target, or an op or matchType outside the supported
// sets, all of which the v2 write path rejects. It reads the relocated
// threshold, so it runs after convertRule, and returns the offending field,
// or "" when the rule stays enabled.
func (rule *postableRule) disableIfThresholdNeverFired() string {
	threshold := rule.RuleCondition.Thresholds.Spec[0]
	var cause string
	switch {
	case threshold.TargetValue == nil:
		cause = "condition.target is null"
	case !slices.Contains(supportedCompareOperators, threshold.CompareOperator):
		cause = fmt.Sprintf("condition.op: unsupported value %q", threshold.CompareOperator)
	case !slices.Contains(supportedMatchTypes, threshold.MatchType):
		cause = fmt.Sprintf("condition.matchType: unsupported value %q", threshold.MatchType)
	default:
		return ""
	}
	rule.Disabled = json.RawMessage("true")
	return cause
}

func (rule *postableRule) fillDurationDefaults() {
	if rule.EvalWindow.IsZero() {
		rule.EvalWindow = mustParseTextDuration("5m")
	}
	if rule.Frequency.IsZero() {
		rule.Frequency = mustParseTextDuration("1m")
	}
}

// validateDurations rejects what the v1 write path never checked: a negative
// evalWindow or frequency, which no read of a rolling window accepts.
func (rule *postableRule) validateDurations() error {
	if !rule.EvalWindow.IsPositive() || !rule.Frequency.IsPositive() {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow %s or frequency %s is negative", rule.EvalWindow, rule.Frequency)
	}
	return nil
}

func (rule *postableRule) deriveAlertType() {
	if slices.Contains(supportedAlertTypes, rule.AlertType) {
		return
	}
	// promql, clickhouse and formula queries carry no signal; they alert on metrics
	rule.AlertType = alertTypeMetric
	for _, envelope := range rule.decodeQueryEnvelopes() {
		switch envelope.Spec.Signal {
		case signalLogs:
			rule.AlertType = alertTypeLogs
			return
		case signalTraces:
			rule.AlertType = alertTypeTraces
			return
		}
	}
}

func (rule *postableRule) deriveQueryType() {
	query := rule.RuleCondition.CompositeQuery
	if slices.Contains(supportedQueryTypes, query.QueryType) {
		return
	}
	envelopes := rule.decodeQueryEnvelopes()
	if len(envelopes) == 0 {
		return
	}
	// a promql or clickhouse_sql envelope spells its type like the composite query does; every other envelope is a builder one
	switch envelopes[0].Type {
	case queryTypePromQL, queryTypeClickHouseSQL:
		query.QueryType = envelopes[0].Type
	default:
		query.QueryType = queryTypeBuilder
	}
}

func (rule *postableRule) repairPanelType() {
	query := rule.RuleCondition.CompositeQuery
	// nothing reads panelType; both alert forms write graph
	if !slices.Contains(supportedPanelTypes, query.PanelType) {
		query.PanelType = panelTypeGraph
	}
}

func (rule *postableRule) disableUnmetMinPoints() {
	condition := rule.RuleCondition
	if string(condition.RequireMinPoints) != "true" {
		return
	}
	points := 0.0
	if len(condition.RequiredNumPoints) > 0 {
		if err := json.Unmarshal(condition.RequiredNumPoints, &points); err != nil {
			return
		}
	}
	if points > 0 {
		return
	}
	// zero required points is a check every series passes
	condition.RequireMinPoints = json.RawMessage("false")
}

func (rule *postableRule) decodeQueryEnvelopes() []ruleQueryEnvelope {
	var envelopes []ruleQueryEnvelope
	if err := json.Unmarshal(rule.RuleCondition.CompositeQuery.Queries, &envelopes); err != nil {
		return nil
	}
	return envelopes
}

func (rule *postableRule) deriveRuleType() {
	switch rule.RuleCondition.CompositeQuery.QueryType {
	case queryTypeBuilder, queryTypeClickHouseSQL:
		if rule.RuleType == "" {
			rule.RuleType = ruleTypeThreshold
		}
	case queryTypePromQL:
		rule.RuleType = ruleTypeProm
	}
}

// negateAnomalyBelowTarget stores "below 3" as -3, since anomaly scores are
// signed. Only the raw "2" negates; "below" and "<" keep the sign the rule
// evaluates with today.
func (rule *postableRule) negateAnomalyBelowTarget() {
	condition := rule.RuleCondition
	if rule.RuleType != ruleTypeAnomaly || condition.CompareOperator != compareOperatorBelow || condition.Target == nil {
		return
	}
	negated := -*condition.Target
	condition.Target = &negated
}

// repairEmptySeverity rewrites a severity of "" as critical in labels and in
// the route expression that matches alerts on it, since a threshold named ""
// fails every later read. It returns storedRoute, or a copy with the new
// expression.
func (rule *postableRule) repairEmptySeverity(ruleID string, storedRoute *routePolicyRow) *routePolicyRow {
	if severity, ok := rule.Labels[labelSeverity]; !ok || severity != "" {
		return storedRoute
	}
	rule.Labels[labelSeverity] = criticalThresholdName
	if storedRoute == nil {
		return nil
	}
	route := *storedRoute
	route.Expression = fmt.Sprintf(`threshold.name == "%s" && ruleId == "%s"`, criticalThresholdName, ruleID)
	return &route
}

func (rule *postableRule) relocateThreshold(channels []string) {
	thresholdName := criticalThresholdName
	if severity, ok := rule.Labels[labelSeverity]; ok {
		thresholdName = severity
	}

	condition := rule.RuleCondition
	condition.Thresholds = &ruleThresholds{
		Kind: "basic",
		Spec: []basicThreshold{{
			Name:            thresholdName,
			TargetValue:     condition.Target,
			TargetUnit:      condition.TargetUnit,
			MatchType:       condition.MatchType,
			CompareOperator: condition.CompareOperator,
			Channels:        channels,
		}},
	}
}

func (rule *postableRule) relocateEvaluation() {
	rule.Evaluation = &evaluationEnvelope{
		Kind: "rolling",
		Spec: rollingWindow{EvalWindow: rule.EvalWindow, Frequency: rule.Frequency},
	}
}

func (rule *postableRule) synthesizeNotificationSettings() {
	alertStates := []string{"firing"}
	if rule.RuleCondition.AlertOnAbsent {
		alertStates = append(alertStates, "nodata")
	}
	rule.NotificationSettings = &notificationSettings{
		Renotify: &renotify{
			Enabled:          true,
			ReNotifyInterval: mustParseTextDuration("4h"),
			AlertStates:      alertStates,
		},
		UsePolicy: false,
	}
}

func (rule *postableRule) clearV1Fields() {
	rule.EvalWindow = textDuration{}
	rule.Frequency = textDuration{}
	rule.PreferredChannels = nil
	rule.RuleCondition.Target = nil
	rule.RuleCondition.CompareOperator = ""
	rule.RuleCondition.MatchType = ""
	rule.RuleCondition.TargetUnit = ""
}

// textDuration decodes a duration the way the app's TextDuration does, a
// string or a number of nanoseconds, and writes a string back in its stored
// spelling.
type textDuration struct {
	text  string
	value time.Duration
}

func mustParseTextDuration(text string) textDuration {
	value, err := time.ParseDuration(text)
	if err != nil {
		panic(err)
	}
	return textDuration{text: text, value: value}
}

func (d textDuration) IsZero() bool {
	return d.value == 0
}

func (d textDuration) IsPositive() bool {
	return d.value > 0
}

func (d textDuration) String() string {
	if d.text != "" {
		return d.text
	}
	return d.value.String()
}

func (d textDuration) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

func (d *textDuration) UnmarshalJSON(data []byte) error {
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	switch value := raw.(type) {
	case float64:
		*d = textDuration{value: time.Duration(value)}
		return nil
	case string:
		parsed, err := time.ParseDuration(value)
		if err != nil {
			return err
		}
		*d = textDuration{text: value, value: parsed}
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid duration %s", data)
	}
}

func (migration *migrateRulesV1ToV2Alpha1) Down(context.Context, *bun.DB) error {
	return nil
}
