package impldashboard

import (
	"context"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes/listfilter"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) dashboardtypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, storabledashboard *dashboardtypes.StorableDashboard) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(storabledashboard).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "dashboard with id %s already exists", storabledashboard.ID)
	}

	return nil
}

func (store *store) CreatePublic(ctx context.Context, storable *dashboardtypes.StorablePublicDashboard) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, dashboardtypes.ErrCodePublicDashboardAlreadyExists, "dashboard with id %s is already public", storable.DashboardID)
	}

	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.StorableDashboard, error) {
	storableDashboard := new(dashboardtypes.StorableDashboard)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storableDashboard).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "dashboard with id %s doesn't exist", id)
	}

	return storableDashboard, nil
}

func (store *store) GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.StorableDashboard, *dashboardtypes.StorablePublicDashboard, error) {
	type joinedRow struct {
		*dashboardtypes.StorableDashboard `bun:",extend"`

		PublicID               *valuer.UUID `bun:"public_id"`
		PublicCreatedAt        *time.Time   `bun:"public_created_at"`
		PublicUpdatedAt        *time.Time   `bun:"public_updated_at"`
		PublicTimeRangeEnabled *bool        `bun:"public_time_range_enabled"`
		PublicDefaultTimeRange *string      `bun:"public_default_time_range"`
	}

	row := &joinedRow{StorableDashboard: new(dashboardtypes.StorableDashboard)}
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(row).
		ColumnExpr("dashboard.id, dashboard.org_id, dashboard.data, dashboard.locked, dashboard.created_at, dashboard.created_by, dashboard.updated_at, dashboard.updated_by").
		ColumnExpr("pd.id AS public_id, pd.created_at AS public_created_at, pd.updated_at AS public_updated_at, pd.time_range_enabled AS public_time_range_enabled, pd.default_time_range AS public_default_time_range").
		Join("LEFT JOIN public_dashboard AS pd ON pd.dashboard_id = dashboard.id").
		Where("dashboard.id = ?", id).
		Where("dashboard.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, nil, store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodeDashboardNotFound, "dashboard with id %s doesn't exist", id)
	}

	if row.PublicID == nil {
		return row.StorableDashboard, nil, nil
	}
	public := &dashboardtypes.StorablePublicDashboard{
		Identifiable:     types.Identifiable{ID: *row.PublicID},
		TimeAuditable:    types.TimeAuditable{CreatedAt: *row.PublicCreatedAt, UpdatedAt: *row.PublicUpdatedAt},
		TimeRangeEnabled: *row.PublicTimeRangeEnabled,
		DefaultTimeRange: *row.PublicDefaultTimeRange,
		DashboardID:      row.ID.StringValue(),
	}
	return row.StorableDashboard, public, nil
}

// ListV2 emits the joined dashboard ⨝ pinned_dashboard ⨝ public_dashboard
// query the spec calls for. Aliases:
//
//	dashboard         — the visitor expects this
//	pinned_dashboard  AS pin  — only used inside this query
//	public_dashboard  AS pd   — the visitor expects this
//
// Sort is "is_pinned DESC, <sort> <order>" so pinned dashboards float to the
// top inside the requested ordering. Title-sort goes through the same
// JSONExtractString path the visitor uses for name/description filtering.
func (store *store) ListV2(
	ctx context.Context,
	orgID valuer.UUID,
	userID valuer.UUID,
	params *dashboardtypes.ListDashboardsV2Params,
) ([]*dashboardtypes.DashboardListRow, bool, error) {
	compiled, err := listfilter.Compile(params.Query, store.sqlstore.Formatter())
	if err != nil {
		return nil, false, err
	}
	type listedRow struct {
		*dashboardtypes.StorableDashboard `bun:",extend"`

		IsPinned bool `bun:"is_pinned"`

		PublicID               *valuer.UUID `bun:"public_id"`
		PublicCreatedAt        *time.Time   `bun:"public_created_at"`
		PublicUpdatedAt        *time.Time   `bun:"public_updated_at"`
		PublicTimeRangeEnabled *bool        `bun:"public_time_range_enabled"`
		PublicDefaultTimeRange *string      `bun:"public_default_time_range"`
	}

	rows := make([]*listedRow, 0)

	q := store.sqlstore.
		BunDB().
		NewSelect().
		Model(&rows).
		ColumnExpr("dashboard.id, dashboard.org_id, dashboard.data, dashboard.locked, dashboard.created_at, dashboard.created_by, dashboard.updated_at, dashboard.updated_by").
		ColumnExpr("CASE WHEN pin.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_pinned").
		ColumnExpr("pd.id AS public_id, pd.created_at AS public_created_at, pd.updated_at AS public_updated_at, pd.time_range_enabled AS public_time_range_enabled, pd.default_time_range AS public_default_time_range").
		Join("LEFT JOIN pinned_dashboard AS pin ON pin.user_id = ? AND pin.dashboard_id = dashboard.id", userID).
		Join("LEFT JOIN public_dashboard AS pd ON pd.dashboard_id = dashboard.id").
		Where("dashboard.org_id = ?", orgID)

	if compiled != nil {
		q = q.Where(compiled.SQL, compiled.Args...)
	}

	sortExpr, err := store.sortExprForListV2(params.Sort)
	if err != nil {
		return nil, false, err
	}
	q = q.
		OrderExpr("is_pinned DESC").
		OrderExpr(sortExpr + " " + strings.ToUpper(string(params.Order))).
		Limit(params.Limit + 1).
		Offset(params.Offset)

	if err := q.Scan(ctx); err != nil {
		return nil, false, err
	}

	hasMore := len(rows) > params.Limit
	if hasMore {
		rows = rows[:params.Limit]
	}

	out := make([]*dashboardtypes.DashboardListRow, len(rows))
	for i, r := range rows {
		row := &dashboardtypes.DashboardListRow{
			Dashboard: r.StorableDashboard,
			Pinned:    r.IsPinned,
		}
		if r.PublicID != nil {
			row.Public = &dashboardtypes.StorablePublicDashboard{
				Identifiable:     types.Identifiable{ID: *r.PublicID},
				TimeAuditable:    types.TimeAuditable{CreatedAt: *r.PublicCreatedAt, UpdatedAt: *r.PublicUpdatedAt},
				TimeRangeEnabled: *r.PublicTimeRangeEnabled,
				DefaultTimeRange: *r.PublicDefaultTimeRange,
				DashboardID:      r.ID.StringValue(),
			}
		}
		out[i] = row
	}
	return out, hasMore, nil
}

// sortExprForListV2 maps a sort enum to the SQL expression to plug into
// ORDER BY. Title-sort routes through the SQLFormatter so it stays
// dialect-aware (matches what listfilter/visitor does for the name filter).
func (store *store) sortExprForListV2(sort dashboardtypes.ListSort) (string, error) {
	switch sort {
	case dashboardtypes.ListSortUpdatedAt:
		return "dashboard.updated_at", nil
	case dashboardtypes.ListSortCreatedAt:
		return "dashboard.created_at", nil
	case dashboardtypes.ListSortName:
		return string(store.sqlstore.Formatter().JSONExtractString("dashboard.data", "$.data.display.name")), nil
	}
	return "", errors.Newf(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardListInvalid,
		"unsupported sort field %q", sort)
}

func (store *store) UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.StorableDashboardData) error {
	res, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model((*dashboardtypes.StorableDashboard)(nil)).
		Set("data = ?", data).
		Set("updated_by = ?", updatedBy).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	// Defends against the race where a delete lands between the caller's
	// pre-update GetV2 and this update.
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, dashboardtypes.ErrCodeDashboardNotFound, "dashboard with id %s doesn't exist", id)
	}
	return nil
}

func (store *store) LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, locked bool, updatedBy string) error {
	res, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model((*dashboardtypes.StorableDashboard)(nil)).
		Set("locked = ?", locked).
		Set("updated_by = ?", updatedBy).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, dashboardtypes.ErrCodeDashboardNotFound, "dashboard with id %s doesn't exist", id)
	}
	return nil
}

func (store *store) GetPublic(ctx context.Context, dashboardID string) (*dashboardtypes.StorablePublicDashboard, error) {
	storable := new(dashboardtypes.StorablePublicDashboard)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Where("dashboard_id = ?", dashboardID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodePublicDashboardNotFound, "dashboard with id %s isn't public", dashboardID)
	}

	return storable, nil
}

func (store *store) GetDashboardByOrgsAndPublicID(ctx context.Context, orgIDs []string, id string) (*dashboardtypes.StorableDashboard, error) {
	storable := new(dashboardtypes.StorableDashboard)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Join("JOIN public_dashboard").
		JoinOn("public_dashboard.dashboard_id = dashboard.id").
		Where("public_dashboard.id = ?", id).
		Where("org_id IN (?)", bun.In(orgIDs)).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodePublicDashboardNotFound, "couldn't find dashboard with id %s ", id)
	}

	return storable, nil
}

func (store *store) GetDashboardByPublicID(ctx context.Context, id string) (*dashboardtypes.StorableDashboard, error) {
	storable := new(dashboardtypes.StorableDashboard)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Join("JOIN public_dashboard").
		JoinOn("public_dashboard.dashboard_id = dashboard.id").
		Where("public_dashboard.id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodePublicDashboardNotFound, "couldn't find dashboard with id %s ", id)
	}

	return storable, nil
}

func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.StorableDashboard, error) {
	storableDashboards := make([]*dashboardtypes.StorableDashboard, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableDashboards).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storableDashboards, nil
}

func (store *store) ListPublic(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.StorablePublicDashboard, error) {
	storable := make([]*dashboardtypes.StorablePublicDashboard, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storable).
		Join("JOIN dashboard").
		JoinOn("public_dashboard.dashboard_id = dashboard.id").
		Where("dashboard.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storable, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, storableDashboard *dashboardtypes.StorableDashboard) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storableDashboard).
		WherePK().
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "dashboard with id %s doesn't exist", storableDashboard.ID)
	}

	return nil
}

func (store *store) UpdatePublic(ctx context.Context, storable *dashboardtypes.StorablePublicDashboard) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storable).
		WherePK().
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodePublicDashboardNotFound, "dashboard with id %s isn't public", storable.DashboardID)
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(dashboardtypes.StorableDashboard)).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "dashboard with id %s doesn't exist", id)
	}

	return nil
}

func (store *store) DeletePublic(ctx context.Context, dashboardID string) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(dashboardtypes.StorablePublicDashboard)).
		Where("dashboard_id = ?", dashboardID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodePublicDashboardNotFound, "dashboard with id %s isn't public", dashboardID)
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}

// PinForUser combines the count check, the existence check, and the upsert in
// a single statement so the limit gate and the insert can't drift between two
// round-trips.
//
//	pin exists? | count < 10? | WHERE passes?           | effect                            | rows
//	------------|-------------|-------------------------|-----------------------------------|-----
//	no          | yes         | yes (count branch)      | INSERT new row                    | 1
//	no          | no          | no                      | nothing (limit hit)               | 0
//	yes         | yes         | yes (count branch)      | INSERT → conflict → no-op UPDATE  | 1
//	yes         | no          | yes (EXISTS OR branch)  | INSERT → conflict → no-op UPDATE  | 1
//
// rows = 0 is the only signal of a real limit hit.
func (store *store) PinForUser(ctx context.Context, pd *dashboardtypes.PinnedDashboard) error {
	res, err := store.sqlstore.BunDBCtx(ctx).NewRaw(`
		INSERT INTO pinned_dashboard (user_id, dashboard_id, org_id, pinned_at)
		SELECT ?, ?, ?, ?
		WHERE (SELECT COUNT(*) FROM pinned_dashboard WHERE user_id = ?) < ?
		   OR EXISTS (SELECT 1 FROM pinned_dashboard WHERE user_id = ? AND dashboard_id = ?)
		ON CONFLICT (user_id, dashboard_id) DO UPDATE SET user_id = EXCLUDED.user_id
	`,
		pd.UserID, pd.DashboardID, pd.OrgID, pd.PinnedAt,
		pd.UserID, dashboardtypes.MaxPinnedDashboardsPerUser,
		pd.UserID, pd.DashboardID,
	).Exec(ctx)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.Newf(errors.TypeAlreadyExists, dashboardtypes.ErrCodePinnedDashboardLimitHit,
			"cannot pin more than %d dashboards", dashboardtypes.MaxPinnedDashboardsPerUser)
	}
	return nil
}

func (store *store) UnpinForUser(ctx context.Context, userID valuer.UUID, dashboardID valuer.UUID) error {
	_, err := store.sqlstore.BunDBCtx(ctx).
		NewDelete().
		Model((*dashboardtypes.PinnedDashboard)(nil)).
		Where("user_id = ?", userID).
		Where("dashboard_id = ?", dashboardID).
		Exec(ctx)
	return err
}
