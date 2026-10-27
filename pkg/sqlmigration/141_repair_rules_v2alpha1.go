package sqlmigration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"slices"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type repairRulesV2Alpha1 struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

func NewRepairRulesV2Alpha1Factory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("repair_rules_v2alpha1"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &repairRulesV2Alpha1{sqlstore: sqlstore, logger: ps.Logger}, nil
	})
}

func (migration *repairRulesV2Alpha1) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up rewrites every v2alpha1 rule in every org where the write path now needs
// a value it lacks: the defaults migration 139 derives for a v1 rule, the
// timezone a cumulative window has to name, the notification settings a rule
// written before they were required, a suffix on a repeated threshold name,
// and disabled when a threshold fails it.
// Keys it does not touch keep their stored bytes. A rule it cannot read is
// logged and left as stored; a failed write aborts the run and rolls back
// every org.
func (migration *repairRulesV2Alpha1) Up(ctx context.Context, _ *bun.DB) error {
	return migration.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		var orgIDs []string
		if err := migration.sqlstore.BunDBCtx(ctx).NewSelect().Table("organizations").Column("id").Scan(ctx, &orgIDs); err != nil {
			return err
		}

		for _, orgID := range orgIDs {
			if err := migration.repairOrg(ctx, orgID); err != nil {
				return err
			}
		}

		return nil
	})
}

func (migration *repairRulesV2Alpha1) repairOrg(ctx context.Context, orgID string) error {
	db := migration.sqlstore.BunDBCtx(ctx)

	rules := make([]*ruleRow, 0)
	if err := db.NewSelect().Model(&rules).Where("org_id = ?", orgID).Scan(ctx); err != nil {
		return err
	}

	var repaired, disabled, skipped, unrepairable int
	for _, stored := range rules {
		var header struct {
			SchemaVersion string `json:"schemaVersion"`
		}
		// a row that does not decode, or is still v1, was reported by migration 139
		if err := json.Unmarshal([]byte(stored.Data), &header); err != nil || header.SchemaVersion != schemaVersionV2Alpha1 {
			skipped++
			continue
		}

		rule, err := repairRule(stored.Data)
		if err != nil {
			unrepairable++
			migration.logger.WarnContext(ctx, "leaving rule as stored", slog.String("org_id", orgID), slog.String("rule_id", stored.ID), errors.Attr(err))
			continue
		}
		if rule.data == "" {
			skipped++
			continue
		}

		stored.Data = rule.data
		if _, err := db.NewUpdate().Model(stored).Column("data").WherePK().Exec(ctx); err != nil {
			return err
		}
		repaired++
		for _, rename := range rule.renamed {
			migration.logger.WarnContext(ctx, "renamed duplicate threshold", slog.String("org_id", orgID), slog.String("rule_id", stored.ID), slog.String("from", rename.from), slog.String("to", rename.to))
		}
		if rule.disabledFor != nil {
			disabled++
			migration.logger.WarnContext(ctx, "disabling rule, its threshold fails the write path", slog.String("org_id", orgID), slog.String("rule_id", stored.ID), errors.Attr(rule.disabledFor))
		}
	}

	migration.logger.InfoContext(ctx, "repaired v2alpha1 rules", slog.String("org_id", orgID), slog.Int("total", len(rules)), slog.Int("repaired", repaired), slog.Int("disabled", disabled), slog.Int("skipped", skipped), slog.Int("unrepairable", unrepairable))
	return nil
}

// repairedRule is a rewritten rule: its data, "" when nothing needed repair,
// the thresholds it renamed and the threshold failure it was disabled for.
type repairedRule struct {
	data        string
	renamed     []thresholdRename
	disabledFor error
}

type thresholdRename struct {
	index    int
	from, to string
}

// repairRule patches the stored document key by key, so the rest of it keeps
// its bytes. The values come from the same derivations migration 139 runs on
// a v1 rule, applied to a second decode so the stored ones remain to compare
// against.
func repairRule(data string) (repairedRule, error) {
	stored, rule := new(postableRule), new(postableRule)
	for _, target := range []*postableRule{stored, rule} {
		if err := json.Unmarshal([]byte(data), target); err != nil {
			return repairedRule{}, err
		}
	}
	if rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
		return repairedRule{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "condition or condition.compositeQuery is null")
	}
	rule.deriveAlertType()
	rule.deriveQueryType()
	rule.repairPanelType()
	rule.disableUnmetMinPoints()
	rule.deriveRuleType()

	var document, condition, query map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &document); err != nil {
		return repairedRule{}, err
	}
	if err := json.Unmarshal(document["condition"], &condition); err != nil {
		return repairedRule{}, err
	}
	if err := json.Unmarshal(condition["compositeQuery"], &query); err != nil {
		return repairedRule{}, err
	}

	changed := false
	if rule.AlertType != stored.AlertType {
		document["alertType"] = quote(rule.AlertType)
		changed = true
	}
	// a stored "" goes too, since the strict type rejects it
	if rule.RuleType != stored.RuleType || string(document["ruleType"]) == `""` {
		delete(document, "ruleType")
		if rule.RuleType != "" {
			document["ruleType"] = quote(rule.RuleType)
		}
		changed = true
	}

	queryChanged := false
	if rule.RuleCondition.CompositeQuery.QueryType != stored.RuleCondition.CompositeQuery.QueryType {
		query["queryType"] = quote(rule.RuleCondition.CompositeQuery.QueryType)
		queryChanged = true
	}
	if rule.RuleCondition.CompositeQuery.PanelType != stored.RuleCondition.CompositeQuery.PanelType {
		query["panelType"] = quote(rule.RuleCondition.CompositeQuery.PanelType)
		queryChanged = true
	}
	conditionChanged := queryChanged
	if queryChanged {
		raw, err := marshalUnescaped(query)
		if err != nil {
			return repairedRule{}, err
		}
		condition["compositeQuery"] = raw
	}
	if string(rule.RuleCondition.RequireMinPoints) != string(stored.RuleCondition.RequireMinPoints) {
		condition["requireMinPoints"] = rule.RuleCondition.RequireMinPoints
		conditionChanged = true
	}
	if string(condition["seasonality"]) == `""` {
		delete(condition, "seasonality")
		conditionChanged = true
	}
	renamed := dedupeThresholdNames(rule.RuleCondition.Thresholds)
	if len(renamed) > 0 {
		if err := renameThresholds(condition, renamed); err != nil {
			return repairedRule{}, err
		}
		conditionChanged = true
	}
	if conditionChanged {
		raw, err := marshalUnescaped(condition)
		if err != nil {
			return repairedRule{}, err
		}
		document["condition"] = raw
		changed = true
	}

	timezoneFilled, err := fillCumulativeTimezone(document)
	if err != nil {
		return repairedRule{}, err
	}
	changed = changed || timezoneFilled

	if rule.NotificationSettings == nil {
		rule.synthesizeNotificationSettings()
		raw, err := marshalUnescaped(rule.NotificationSettings)
		if err != nil {
			return repairedRule{}, err
		}
		document["notificationSettings"] = raw
		changed = true
	}

	disabledFor := validateThresholds(rule.RuleCondition.Thresholds)
	if disabledFor != nil && string(document["disabled"]) != "true" {
		document["disabled"] = json.RawMessage("true")
		changed = true
	}

	if !changed {
		return repairedRule{}, nil
	}
	raw, err := marshalUnescaped(document)
	if err != nil {
		return repairedRule{}, err
	}
	return repairedRule{data: string(raw), renamed: renamed, disabledFor: disabledFor}, nil
}

// dedupeThresholdNames suffixes every repeat of a name with -2, -3, ... in
// order of appearance, skipping a suffix another threshold already carries.
// An empty name stays, since validateThresholds disables the rule for it.
func dedupeThresholdNames(thresholds *ruleThresholds) []thresholdRename {
	if thresholds == nil {
		return nil
	}
	names := make(map[string]struct{}, len(thresholds.Spec))
	for _, threshold := range thresholds.Spec {
		names[threshold.Name] = struct{}{}
	}

	seen := make(map[string]struct{}, len(thresholds.Spec))
	var renamed []thresholdRename
	for i, threshold := range thresholds.Spec {
		if _, dup := seen[threshold.Name]; !dup || threshold.Name == "" {
			seen[threshold.Name] = struct{}{}
			continue
		}
		name := ""
		for n := 2; ; n++ {
			name = fmt.Sprintf("%s-%d", threshold.Name, n)
			if _, taken := names[name]; !taken {
				break
			}
		}
		names[name] = struct{}{}
		thresholds.Spec[i].Name = name
		renamed = append(renamed, thresholdRename{index: i, from: threshold.Name, to: name})
	}
	return renamed
}

func renameThresholds(condition map[string]json.RawMessage, renamed []thresholdRename) error {
	var thresholds map[string]json.RawMessage
	if err := json.Unmarshal(condition["thresholds"], &thresholds); err != nil {
		return err
	}
	var spec []map[string]json.RawMessage
	if err := json.Unmarshal(thresholds["spec"], &spec); err != nil {
		return err
	}
	for _, rename := range renamed {
		spec[rename.index]["name"] = quote(rename.to)
	}

	raw, err := marshalUnescaped(spec)
	if err != nil {
		return err
	}
	thresholds["spec"] = raw
	if raw, err = marshalUnescaped(thresholds); err != nil {
		return err
	}
	condition["thresholds"] = raw
	return nil
}

// fillCumulativeTimezone names the UTC an empty timezone always resolved to,
// now that the write path requires one.
func fillCumulativeTimezone(document map[string]json.RawMessage) (bool, error) {
	var evaluation struct {
		Kind string                     `json:"kind"`
		Spec map[string]json.RawMessage `json:"spec"`
	}
	if err := json.Unmarshal(document["evaluation"], &evaluation); err != nil || evaluation.Kind != "cumulative" || evaluation.Spec == nil {
		return false, nil
	}
	if timezone := string(evaluation.Spec["timezone"]); timezone != "" && timezone != `""` {
		return false, nil
	}

	evaluation.Spec["timezone"] = json.RawMessage(`"UTC"`)
	raw, err := marshalUnescaped(evaluation)
	if err != nil {
		return false, err
	}
	document["evaluation"] = raw
	return true, nil
}

// validateThresholds is migration 139's threshold check over every threshold
// of a v2alpha1 rule, which may hold several, plus the name the v1 path
// always fills.
func validateThresholds(thresholds *ruleThresholds) error {
	if thresholds == nil {
		return nil
	}
	for _, threshold := range thresholds.Spec {
		if threshold.Name == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.thresholds.spec: threshold name is empty")
		}
		if threshold.TargetValue == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.target is null")
		}
		if !slices.Contains(supportedCompareOperators, threshold.CompareOperator) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.op: unsupported value %q", threshold.CompareOperator)
		}
		if !slices.Contains(supportedMatchTypes, threshold.MatchType) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.matchType: unsupported value %q", threshold.MatchType)
		}
	}
	return nil
}

// quote encodes a value the migration chose itself, so it cannot fail.
func quote(value string) json.RawMessage {
	raw, _ := json.Marshal(value)
	return raw
}

func (migration *repairRulesV2Alpha1) Down(context.Context, *bun.DB) error {
	return nil
}
