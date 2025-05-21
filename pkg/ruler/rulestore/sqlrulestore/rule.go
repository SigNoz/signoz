package sqlrulestore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type rule struct {
	*sqlx.DB
	sqlstore sqlstore.SQLStore
}

func NewRuleStore(db *sqlx.DB, store sqlstore.SQLStore) ruletypes.RuleStore {
	return &rule{sqlstore: store, DB: db}
}

func (r *rule) CreateRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storedRule).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx, storedRule.ID)
	})

	if err != nil {
		return valuer.UUID{}, err
	}

	return storedRule.ID, nil
}

func (r *rule) EditRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context) error) error {
	return r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storedRule).
			Where("id = ?", storedRule.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	})
}

func (r *rule) DeleteRule(ctx context.Context, id valuer.UUID, cb func(context.Context) error) error {
	if err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(ruletypes.Rule)).
			Where("id = ?", id.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	}); err != nil {
		return err
	}

	return nil
}

func (r *rule) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	rules := make([]*ruletypes.Rule, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return rules, err
	}

	return rules, nil
}

func (r *rule) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	rule := new(ruletypes.Rule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(rule).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}
	return rule, nil
}

func (r *rule) GetRuleUUID(ctx context.Context, ruleID int) (*ruletypes.RuleHistory, error) {
	ruleHistory := new(ruletypes.RuleHistory)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(ruleHistory).
		Where("rule_id = ?", ruleID).
		Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}
	return ruleHistory, nil
}

func (r *rule) ListOrgs(ctx context.Context) ([]valuer.UUID, error) {
	orgIDStrs := make([]string, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(new(types.Organization)).
		Column("id").
		Scan(ctx, &orgIDStrs)
	if err != nil {
		return nil, err
	}

	orgIDs := make([]valuer.UUID, len(orgIDStrs))
	for idx, orgIDStr := range orgIDStrs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return nil, err
		}
		orgIDs[idx] = orgID
	}

	return orgIDs, nil
}
