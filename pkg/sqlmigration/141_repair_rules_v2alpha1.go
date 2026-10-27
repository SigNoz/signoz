package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

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

// Up rewrites every v2alpha1 rule this release no longer decodes: a ruleType
// or condition.seasonality of "" is dropped, so the read path fills it the way
// it filled "", and a cumulative window with no timezone, or "", gets the UTC
// an empty one always resolved to. Every other key keeps its stored bytes, and
// a rule that needs nothing is not written.
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

	var repaired, skipped, undecodable int
	for _, stored := range rules {
		var document map[string]json.RawMessage
		if err := json.Unmarshal([]byte(stored.Data), &document); err != nil {
			undecodable++
			migration.logger.WarnContext(ctx, "failed to decode stored rule", slog.String("org_id", orgID), slog.String("rule_id", stored.ID), errors.Attr(err))
			continue
		}
		// a rule still at v1 was reported by migration 140
		var schemaVersion string
		if err := json.Unmarshal(document["schemaVersion"], &schemaVersion); err != nil || schemaVersion != schemaVersionV2Alpha1 {
			skipped++
			continue
		}

		data, err := repairEmptyStrings(document)
		if err != nil {
			undecodable++
			migration.logger.WarnContext(ctx, "failed to decode stored rule", slog.String("org_id", orgID), slog.String("rule_id", stored.ID), errors.Attr(err))
			continue
		}
		if data == "" {
			skipped++
			continue
		}

		stored.Data = data
		if _, err := db.NewUpdate().Model(stored).Column("data").WherePK().Exec(ctx); err != nil {
			return err
		}
		repaired++
	}

	migration.logger.InfoContext(ctx, "repaired v2alpha1 rules", slog.String("org_id", orgID), slog.Int("total", len(rules)), slog.Int("repaired", repaired), slog.Int("skipped", skipped), slog.Int("undecodable", undecodable))
	return nil
}

// repairEmptyStrings returns the rewritten document, or "" when it holds no
// value that needs rewriting.
func repairEmptyStrings(document map[string]json.RawMessage) (string, error) {
	changed := false
	if string(document["ruleType"]) == `""` {
		delete(document, "ruleType")
		changed = true
	}

	var condition map[string]json.RawMessage
	if raw, ok := document["condition"]; ok {
		if err := json.Unmarshal(raw, &condition); err != nil {
			return "", err
		}
	}
	if string(condition["seasonality"]) == `""` {
		delete(condition, "seasonality")
		raw, err := marshalUnescaped(condition)
		if err != nil {
			return "", err
		}
		document["condition"] = raw
		changed = true
	}

	var evaluation struct {
		Kind string                     `json:"kind"`
		Spec map[string]json.RawMessage `json:"spec"`
	}
	if raw, ok := document["evaluation"]; ok {
		if err := json.Unmarshal(raw, &evaluation); err != nil {
			return "", err
		}
	}
	if timezone := string(evaluation.Spec["timezone"]); evaluation.Kind == "cumulative" && evaluation.Spec != nil && (timezone == "" || timezone == `""`) {
		evaluation.Spec["timezone"] = json.RawMessage(`"UTC"`)
		raw, err := marshalUnescaped(evaluation)
		if err != nil {
			return "", err
		}
		document["evaluation"] = raw
		changed = true
	}

	if !changed {
		return "", nil
	}
	raw, err := marshalUnescaped(document)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (migration *repairRulesV2Alpha1) Down(context.Context, *bun.DB) error {
	return nil
}
