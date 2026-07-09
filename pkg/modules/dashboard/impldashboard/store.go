package impldashboard

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
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
		BunDBCtx(ctx).
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

// ListForUser emits the joined dashboard ⨝ user_dashboard_preference query the
// spec calls for. Aliases:
//
//	dashboard                  — the visitor expects this
//	user_dashboard_preference  AS preference  — only used inside this query
//
// Sort is "is_pinned DESC, <sort> <order>" so pinned dashboards float to the
// top inside the requested ordering. Name-sort goes through the same
// JSONExtractString path the visitor uses for name/description filtering.
func (store *store) ListForUser(
	ctx context.Context,
	orgID valuer.UUID,
	userID valuer.UUID,
	params *dashboardtypes.ListDashboardsV2Params,
) ([]*dashboardtypes.StorableDashboardWithPinInfo, int64, error) {
	compiled, err := Compile(params.Query, store.sqlstore.Formatter())
	if err != nil {
		return nil, 0, err
	}
	type listedRow struct {
		*dashboardtypes.StorableDashboard `bun:",extend"`

		IsPinned bool  `bun:"is_pinned"`
		Total    int64 `bun:"total"`
	}

	rows := make([]*listedRow, 0)

	q := store.sqlstore.
		BunDB().
		NewSelect().
		Model(&rows).
		ColumnExpr("dashboard.id, dashboard.org_id, dashboard.name, dashboard.data, dashboard.locked, dashboard.source, dashboard.created_at, dashboard.created_by, dashboard.updated_at, dashboard.updated_by").
		ColumnExpr("CASE WHEN preference.is_pinned THEN 1 ELSE 0 END AS is_pinned").
		ColumnExpr("COUNT(*) OVER () AS total").
		Join("LEFT JOIN user_dashboard_preference AS preference ON preference.user_id = ? AND preference.dashboard_id = dashboard.id", userID).
		Where("dashboard.org_id = ?", orgID).
		Where("dashboard.source != ?", dashboardtypes.SourceSystem)

	if !compiled.IsEmpty() {
		q = q.Where(compiled.SQL, compiled.Args...)
	}

	sortExpr, err := store.sortExprForListV2(params.Sort)
	if err != nil {
		return nil, 0, err
	}
	q = q.
		OrderExpr("is_pinned DESC").
		OrderExpr(sortExpr + " " + strings.ToUpper(params.Order.StringValue())).
		Limit(params.Limit).
		Offset(params.Offset)

	if err := q.Scan(ctx); err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list dashboards")
	}

	// COUNT(*) OVER () is computed pre-LIMIT, so any returned row carries the
	// full filter total. Empty result page => zero matches.
	var total int64
	if len(rows) > 0 {
		total = rows[0].Total
	}

	out := make([]*dashboardtypes.StorableDashboardWithPinInfo, len(rows))
	for i, r := range rows {
		out[i] = &dashboardtypes.StorableDashboardWithPinInfo{
			Dashboard: r.StorableDashboard,
			Pinned:    r.IsPinned,
		}
	}
	return out, total, nil
}

// ListV2 is the pure (user-independent) list: the same filter/sort/pagination as
// ListForUser, but without the per-user pin join or pin-first ordering.
func (store *store) ListV2(
	ctx context.Context,
	orgID valuer.UUID,
	params *dashboardtypes.ListDashboardsV2Params,
) ([]*dashboardtypes.StorableDashboard, int64, error) {
	compiled, err := Compile(params.Query, store.sqlstore.Formatter())
	if err != nil {
		return nil, 0, err
	}
	type listedRow struct {
		*dashboardtypes.StorableDashboard `bun:",extend"`

		Total int64 `bun:"total"`
	}

	rows := make([]*listedRow, 0)

	q := store.sqlstore.
		BunDB().
		NewSelect().
		Model(&rows).
		ColumnExpr("dashboard.id, dashboard.org_id, dashboard.name, dashboard.data, dashboard.locked, dashboard.source, dashboard.created_at, dashboard.created_by, dashboard.updated_at, dashboard.updated_by").
		ColumnExpr("COUNT(*) OVER () AS total").
		Where("dashboard.org_id = ?", orgID).
		Where("dashboard.source != ?", dashboardtypes.SourceSystem)

	if !compiled.IsEmpty() {
		q = q.Where(compiled.SQL, compiled.Args...)
	}

	sortExpr, err := store.sortExprForListV2(params.Sort)
	if err != nil {
		return nil, 0, err
	}
	q = q.
		OrderExpr(sortExpr + " " + strings.ToUpper(params.Order.StringValue())).
		Limit(params.Limit).
		Offset(params.Offset)

	if err := q.Scan(ctx); err != nil {
		return nil, 0, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list dashboards")
	}

	// COUNT(*) OVER () is computed pre-LIMIT, so any returned row carries the
	// full filter total. Empty result page => zero matches.
	var total int64
	if len(rows) > 0 {
		total = rows[0].Total
	}

	out := make([]*dashboardtypes.StorableDashboard, len(rows))
	for i, r := range rows {
		out[i] = r.StorableDashboard
	}
	return out, total, nil
}

// sortExprForListV2 maps a sort enum to the SQL expression to plug into
// ORDER BY. Title-sort routes through the SQLFormatter so it stays
// dialect-aware (matches what the filter visitor does for the name filter).
func (store *store) sortExprForListV2(sort dashboardtypes.ListSort) (string, error) {
	switch sort {
	case dashboardtypes.ListSortUpdatedAt:
		return "dashboard.updated_at", nil
	case dashboardtypes.ListSortCreatedAt:
		return "dashboard.created_at", nil
	case dashboardtypes.ListSortName:
		return string(store.sqlstore.Formatter().JSONExtractString("dashboard.data", "$.spec.display.name")), nil
	}
	return "", errors.Newf(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardListInvalid,
		"unsupported sort field %q", sort)
}

func (store *store) ListByDataContainsAny(ctx context.Context, orgID valuer.UUID, searches []string) ([]*dashboardtypes.StorableDashboard, error) {
	storableDashboards := make([]*dashboardtypes.StorableDashboard, 0)
	if len(searches) == 0 {
		return storableDashboards, nil
	}

	clause, args := buildContainsAnyClauseForDataColumn(store.sqlstore.Formatter(), searches)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableDashboards).
		Where("org_id = ?", orgID).
		Where(clause, args...).
		Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list dashboards by data")
	}

	return storableDashboards, nil
}

// buildContainsAnyClauseForDataColumn builds a parenthesised OR of `data LIKE` predicates, one
// per search, matching the raw substring literally (LIKE wildcards escaped). It
// returns the predicate and its bind args, ready for a single bun Where call.
func buildContainsAnyClauseForDataColumn(formatter sqlstore.SQLFormatter, searches []string) (string, []any) {
	conditions := make([]string, 0, len(searches))
	args := make([]any, 0, len(searches))
	for _, search := range searches {
		conditions = append(conditions, "data LIKE ? ESCAPE '\\'")
		args = append(args, "%"+formatter.EscapeLikePattern(search)+"%")
	}
	return "(" + strings.Join(conditions, " OR ") + ")", args
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
		BunDBCtx(ctx).
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
// round-trips. The count and existence checks gate on is_pinned = true so they
// stay correct once the row carries preferences other than the pin.
//
//	pin exists? | pinned count < 10? | WHERE passes?           | effect                              | rows
//	------------|--------------------|-------------------------|-------------------------------------|-----
//	no          | yes                | yes (count branch)      | INSERT new pinned row               | 1
//	no          | no                 | no                      | nothing (limit hit)                 | 0
//	yes         | yes                | yes (count branch)      | INSERT → conflict → UPDATE is_pinned| 1
//	yes         | no                 | yes (EXISTS OR branch)  | INSERT → conflict → UPDATE is_pinned| 1
//
// rows = 0 is the only signal of a real limit hit.
func (store *store) PinForUser(ctx context.Context, preference *dashboardtypes.UserDashboardPreference) error {
	res, err := store.sqlstore.BunDBCtx(ctx).NewRaw(`
		INSERT INTO user_dashboard_preference (id, user_id, dashboard_id, is_pinned, created_at, updated_at)
		SELECT ?, ?, ?, true, ?, ?
		WHERE (SELECT COUNT(*) FROM user_dashboard_preference WHERE user_id = ? AND is_pinned = true) < ?
		   OR EXISTS (SELECT 1 FROM user_dashboard_preference WHERE user_id = ? AND dashboard_id = ? AND is_pinned = true)
		ON CONFLICT (user_id, dashboard_id) DO UPDATE SET is_pinned = true, updated_at = ?
	`,
		preference.ID, preference.UserID, preference.DashboardID, preference.CreatedAt, preference.UpdatedAt,
		preference.UserID, dashboardtypes.MaxPinnedDashboardsPerUser,
		preference.UserID, preference.DashboardID,
		preference.UpdatedAt,
	).Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't pin dashboard for user")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't read pin result")
	}
	if rows == 0 {
		return errors.Newf(errors.TypeAlreadyExists, dashboardtypes.ErrCodePinnedDashboardLimitHit,
			"cannot pin more than %d dashboards", dashboardtypes.MaxPinnedDashboardsPerUser)
	}
	return nil
}

// UnpinForUser deletes the user's preference row. This is fine while is_pinned
// is the only preference stored; once the row carries other preferences this
// must become an UPDATE that clears is_pinned instead of dropping the row.
func (store *store) UnpinForUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, dashboardID valuer.UUID) error {
	// No org_id on the preference table, so scope by org via a subquery on the
	// parent (DELETE-with-JOIN isn't portable across Postgres/SQLite).
	dashboardIDsInOrgSubQuery := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		TableExpr("dashboard").
		Column("id").
		Where("org_id = ?", orgID)

	_, err := store.sqlstore.BunDBCtx(ctx).
		NewDelete().
		Model((*dashboardtypes.UserDashboardPreference)(nil)).
		Where("user_id = ?", userID).
		Where("dashboard_id = ?", dashboardID).
		Where("dashboard_id IN (?)", dashboardIDsInOrgSubQuery).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't unpin dashboard for user")
	}
	return nil
}

func (store *store) DeletePreferencesForDashboard(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) error {
	// No org_id on the preference table, so scope by org via a subquery on the
	// parent (DELETE-with-JOIN isn't portable across Postgres/SQLite).
	dashboardIDsInOrgSubQuery := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		TableExpr("dashboard").
		Column("id").
		Where("org_id = ?", orgID)
	_, err := store.sqlstore.BunDBCtx(ctx).
		NewDelete().
		Model((*dashboardtypes.UserDashboardPreference)(nil)).
		Where("dashboard_id = ?", dashboardID).
		Where("dashboard_id IN (?)", dashboardIDsInOrgSubQuery).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't delete dashboard preferences")
	}
	return nil
}

func (store *store) DeletePreferencesForUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error {
	// No org_id on the preference table, so scope by org via a subquery on the
	// parent (DELETE-with-JOIN isn't portable across Postgres/SQLite).
	userIDsInOrgSubQuery := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		TableExpr("users").
		Column("id").
		Where("org_id = ?", orgID)
	_, err := store.sqlstore.BunDBCtx(ctx).
		NewDelete().
		Model((*dashboardtypes.UserDashboardPreference)(nil)).
		Where("user_id = ?", userID).
		Where("user_id IN (?)", userIDsInOrgSubQuery).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't delete dashboard preferences")
	}
	return nil
}

func (store *store) CreateDashboardView(ctx context.Context, view *dashboardtypes.DashboardView) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(view).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "dashboard view with id %s already exists", view.ID)
	}
	return nil
}

func (store *store) GetDashboardView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardView, error) {
	view := new(dashboardtypes.DashboardView)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(view).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, dashboardtypes.ErrCodeDashboardViewNotFound, "dashboard view with id %s doesn't exist", id)
	}
	return view, nil
}

func (store *store) ListDashboardViews(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.DashboardView, error) {
	views := make([]*dashboardtypes.DashboardView, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&views).
		Where("org_id = ?", orgID).
		OrderExpr("updated_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list dashboard views")
	}
	return views, nil
}

func (store *store) UpdateDashboardView(ctx context.Context, view *dashboardtypes.DashboardView) error {
	res, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(view).
		WherePK().
		Where("org_id = ?", view.OrgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't update dashboard view")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't read dashboard view update result")
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, dashboardtypes.ErrCodeDashboardViewNotFound, "dashboard view with id %s doesn't exist", view.ID)
	}
	return nil
}

func (store *store) DeleteDashboardView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	res, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(dashboardtypes.DashboardView)).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't delete dashboard view")
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't read dashboard view delete result")
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, dashboardtypes.ErrCodeDashboardViewNotFound, "dashboard view with id %s doesn't exist", id)
	}
	return nil
}
