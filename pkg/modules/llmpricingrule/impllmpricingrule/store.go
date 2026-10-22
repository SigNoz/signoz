package impllmpricingrule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// Columns an existing row gets when a rule matches it. id, org_id, source_id,
// created_at and created_by are never changed.
var upsertColumns = []string{"model", "provider", "model_pattern", "unit", "pricing", "is_override", "enabled", "synced_at", "updated_at", "updated_by"}

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) llmpricingruletypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) List(ctx context.Context, orgID valuer.UUID, offset, limit int, search string, isOverride *bool) ([]*llmpricingruletypes.LLMPricingRule, int, error) {
	rules := make([]*llmpricingruletypes.LLMPricingRule, 0)

	query := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID)

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("(LOWER(model) LIKE LOWER(?) OR LOWER(provider) LIKE LOWER(?))", like, like)
	}

	if isOverride != nil {
		query = query.Where("is_override = ?", *isOverride)
	}

	count, err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		ScanAndCount(ctx)
	if err != nil {
		return nil, 0, err
	}

	return rules, count, nil
}

func (store *store) Get(ctx context.Context, orgID, id valuer.UUID) (*llmpricingruletypes.LLMPricingRule, error) {
	rule := new(llmpricingruletypes.LLMPricingRule)

	err := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(rule).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, llmpricingruletypes.ErrCodePricingRuleNotFound, "pricing rule %s not found in the org", id)
	}

	return rule, nil
}

// UpsertByID replaces the row with the same id, or inserts when there is
// none. Rows of other orgs are left alone and reported as not found.
func (store *store) UpsertByID(ctx context.Context, rules []*llmpricingruletypes.LLMPricingRule) error {
	if len(rules) == 0 {
		return nil
	}

	// bun can overwrite the rules slice with the rows it gets back, so count first.
	expected := len(rules)
	query := store.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&rules).
		On("CONFLICT (id) DO UPDATE").
		Where("llm_pricing_rule.org_id = EXCLUDED.org_id")
	for _, col := range upsertColumns {
		query = query.Set("? = EXCLUDED.?", bun.Ident(col), bun.Ident(col))
	}

	res, err := query.Exec(ctx)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if int(affected) != expected {
		return errors.Newf(errors.TypeNotFound, llmpricingruletypes.ErrCodePricingRuleNotFound, "one or more pricing rules not found in the org")
	}

	return nil
}

// UpsertBySourceID replaces the row with the same source_id, or inserts when
// there is none. Rows the user has overridden are skipped.
func (store *store) UpsertBySourceID(ctx context.Context, rules []*llmpricingruletypes.LLMPricingRule) error {
	if len(rules) == 0 {
		return nil
	}

	query := store.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&rules).
		On("CONFLICT (org_id, source_id) WHERE source_id IS NOT NULL DO UPDATE").
		Where("NOT llm_pricing_rule.is_override")
	for _, col := range upsertColumns {
		query = query.Set("? = EXCLUDED.?", bun.Ident(col), bun.Ident(col))
	}

	_, err := query.Exec(ctx)
	return err
}

func (store *store) Delete(ctx context.Context, orgID, id valuer.UUID) error {
	res, err := store.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model((*llmpricingruletypes.LLMPricingRule)(nil)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, llmpricingruletypes.ErrCodePricingRuleNotFound, "pricing rule %s not found in the org", id)
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, cb)
}
