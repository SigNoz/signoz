package impllmpricingrule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) llmpricingruletypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*llmpricingruletypes.LLMPricingRule, int, error) {
	rules := make([]*llmpricingruletypes.LLMPricingRule, 0)

	count, err := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
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

func (store *store) GetBySourceID(ctx context.Context, orgID, sourceID valuer.UUID) (*llmpricingruletypes.LLMPricingRule, error) {
	rule := new(llmpricingruletypes.LLMPricingRule)

	err := store.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(rule).
		Where("org_id = ?", orgID).
		Where("source_id = ?", sourceID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, llmpricingruletypes.ErrCodePricingRuleNotFound, "pricing rule with source_id %s not found in the org", sourceID)
	}

	return rule, nil
}

func (store *store) Create(ctx context.Context, rule *llmpricingruletypes.LLMPricingRule) error {
	_, err := store.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(rule).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, llmpricingruletypes.ErrCodePricingRuleAlreadyExists, "pricing rule with model %s already exists", rule.Model)
	}
	return nil
}

func (store *store) Update(ctx context.Context, rule *llmpricingruletypes.LLMPricingRule) error {
	res, err := store.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(rule).
		Where("org_id = ?", rule.OrgID).
		Where("id = ?", rule.ID).
		ExcludeColumn("id", "org_id", "source_id", "created_at", "created_by").
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, llmpricingruletypes.ErrCodePricingRuleNotFound, "pricing rule %s not found in the org", rule.ID)
	}

	return nil
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
