package dashboardreports

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	dashboardreporttypes "github.com/SigNoz/signoz/pkg/types/dashboardreporttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type scheduledReportsStore struct {
	sqlstore sqlstore.SQLStore
}

func NewScheduledReportsStore(sqlStore sqlstore.SQLStore) *scheduledReportsStore {
	return &scheduledReportsStore{sqlstore: sqlStore}
}

func storableScheduledReportToGettable(storable *dashboardreporttypes.StorableScheduledDashboardReport) *dashboardreporttypes.GettableScheduledDashboardReport {
	if storable == nil {
		return nil
	}

	return &dashboardreporttypes.GettableScheduledDashboardReport{
		Identifiable: storable.Identifiable,
		OrgID:        storable.OrgID,
		DashboardID:  storable.DashboardID,
		Name:         storable.Name,
		Recipients:   storable.Recipients,
		Schedule:     storable.Schedule,
		TimeRange:    storable.TimeRange,
		Variables:    storable.Variables,
	}
}

func (s *scheduledReportsStore) CreateScheduledReport(
	ctx context.Context,
	postable dashboardreporttypes.PostableScheduledDashboardReport,
) (*dashboardreporttypes.GettableScheduledDashboardReport, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	storable := dashboardreporttypes.StorableScheduledDashboardReport{
		OrgID:       claims.OrgID,
		DashboardID: postable.DashboardID,
		Name:        postable.Name,
		Recipients:  postable.Recipients,
		Schedule:    postable.Schedule,
		TimeRange:   postable.TimeRange,
		Variables:   postable.Variables,
	}
	if storable.Variables == nil {
		storable.Variables = dashboardreporttypes.VariablesSnapshot{}
	}
	storable.ID = valuer.GenerateUUID()

	_, err = s.sqlstore.BunDBCtx(ctx).NewInsert().Model(&storable).Exec(ctx)
	if err != nil {
		return nil, err
	}

	return storableScheduledReportToGettable(&storable), nil
}

func (s *scheduledReportsStore) ListScheduledReports(
	ctx context.Context,
	orgID string,
	dashboardID *valuer.UUID,
) ([]*dashboardreporttypes.GettableScheduledDashboardReport, error) {
	storables := make([]*dashboardreporttypes.StorableScheduledDashboardReport, 0)

	q := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&storables).
		Where("org_id = ?", orgID)

	if dashboardID != nil {
		q = q.Where("dashboard_id = ?", dashboardID.StringValue())
	}

	if err := q.Scan(ctx); err != nil {
		return nil, err
	}

	gettable := make([]*dashboardreporttypes.GettableScheduledDashboardReport, 0, len(storables))
	for _, storable := range storables {
		gettable = append(gettable, storableScheduledReportToGettable(storable))
	}

	return gettable, nil
}

func (s *scheduledReportsStore) GetScheduledReportByID(
	ctx context.Context,
	orgID string,
	id valuer.UUID,
) (*dashboardreporttypes.GettableScheduledDashboardReport, error) {
	storable := new(dashboardreporttypes.StorableScheduledDashboardReport)

	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, s.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "scheduled report with id %s doesn't exist", id)
		}
		return nil, err
	}

	return storableScheduledReportToGettable(storable), nil
}

func (s *scheduledReportsStore) DeleteScheduledReport(
	ctx context.Context,
	orgID string,
	id valuer.UUID,
) error {
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(dashboardreporttypes.StorableScheduledDashboardReport)).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return s.sqlstore.WrapNotFoundErrf(sql.ErrNoRows, errors.CodeNotFound, "scheduled report with id %s doesn't exist", id)
	}

	return nil
}
