package implmetricreductionrule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) metricreductionruletypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) List(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams) ([]*metricreductionruletypes.ReductionRule, int, error) {
	column := "metric_name"
	if params.OrderBy == metricreductionruletypes.OrderByLastUpdated {
		column = "updated_at"
	}
	direction := "ASC"
	if params.Order == metricreductionruletypes.OrderDesc {
		direction = "DESC"
	}

	rules := make([]*metricreductionruletypes.ReductionRule, 0)
	query := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
		Order(column + " " + direction)
	if params.Search != "" {
		query = query.Where("metric_name LIKE ?", "%"+params.Search+"%")
	}
	if params.MetricName != "" {
		query = query.Where("metric_name = ?", params.MetricName)
	}
	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	total, err := query.ScanAndCount(ctx)
	if err != nil {
		return nil, 0, err
	}
	return rules, total, nil
}

func (s *store) Get(ctx context.Context, orgID valuer.UUID, metricName string) (*metricreductionruletypes.ReductionRule, error) {
	rule := new(metricreductionruletypes.ReductionRule)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(rule).
		Where("org_id = ?", orgID).
		Where("metric_name = ?", metricName).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, metricreductionruletypes.ErrCodeMetricReductionRuleNotFound, "no reduction rule found for metric %q", metricName)
	}
	return rule, nil
}

func (s *store) GetByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*metricreductionruletypes.ReductionRule, error) {
	rule := new(metricreductionruletypes.ReductionRule)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(rule).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, metricreductionruletypes.ErrCodeMetricReductionRuleNotFound, "no reduction rule found with id %q", id.String())
	}
	return rule, nil
}

func (s *store) Create(ctx context.Context, rule *metricreductionruletypes.ReductionRule) error {
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(rule).
		On("CONFLICT (org_id, metric_name) DO NOTHING").
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeAlreadyExists, metricreductionruletypes.ErrCodeMetricReductionRuleAlreadyExists,
			"a reduction rule for metric %q already exists", rule.MetricName)
	}
	return nil
}

func (s *store) Upsert(ctx context.Context, rule *metricreductionruletypes.ReductionRule) error {
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(rule).
		On("CONFLICT (org_id, metric_name) DO UPDATE").
		Set("match_type = EXCLUDED.match_type").
		Set("labels = EXCLUDED.labels").
		Set("effective_from = EXCLUDED.effective_from").
		Set("updated_at = EXCLUDED.updated_at").
		Set("updated_by = EXCLUDED.updated_by").
		Exec(ctx)
	return err
}

func (s *store) DeleteByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model((*metricreductionruletypes.ReductionRule)(nil)).
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
		return errors.Newf(errors.TypeNotFound, metricreductionruletypes.ErrCodeMetricReductionRuleNotFound, "no reduction rule found with id %q", id.String())
	}
	return nil
}

func (s *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return s.sqlstore.RunInTxCtx(ctx, nil, cb)
}
