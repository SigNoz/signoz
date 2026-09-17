package sqlrulestore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (r *rule) CreateRuleView(ctx context.Context, view *ruletypes.RuleView) error {
	_, err := r.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(view).
		Exec(ctx)
	if err != nil {
		return r.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "rule view with id %s already exists", view.ID)
	}
	return nil
}

func (r *rule) GetRuleView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*ruletypes.RuleView, error) {
	view := new(ruletypes.RuleView)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(view).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, ruletypes.ErrCodeRuleViewNotFound, "rule view with id %s doesn't exist", id)
	}
	return view, nil
}

func (r *rule) ListRuleViews(ctx context.Context, orgID valuer.UUID) ([]*ruletypes.RuleView, error) {
	views := make([]*ruletypes.RuleView, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&views).
		Where("org_id = ?", orgID).
		OrderExpr("updated_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list rule views")
	}
	return views, nil
}

func (r *rule) UpdateRuleView(ctx context.Context, view *ruletypes.RuleView) error {
	res, err := r.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(view).
		WherePK().
		Where("org_id = ?", view.OrgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't update rule view")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't read rule view update result")
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, ruletypes.ErrCodeRuleViewNotFound, "rule view with id %s doesn't exist", view.ID)
	}
	return nil
}

func (r *rule) DeleteRuleView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	res, err := r.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(ruletypes.RuleView)).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't delete rule view")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't read rule view delete result")
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, ruletypes.ErrCodeRuleViewNotFound, "rule view with id %s doesn't exist", id)
	}
	return nil
}
