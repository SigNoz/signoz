package sqlroutingstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	routeTypes "github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) routeTypes.RouteStore {
	return &store{
		sqlstore: sqlstore,
	}
}

func (store *store) GetByID(ctx context.Context, orgId string, id string) (*routeTypes.ExpressionRoute, error) {
	route := new(routeTypes.ExpressionRoute)
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(route).Where("id = ?", id).Where("org_id = ?", orgId).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "expression route with ID: %s does not exist", id)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch expression route with ID: %s", id)
	}

	return route, nil
}

func (store *store) Create(ctx context.Context, route *routeTypes.ExpressionRoute) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewInsert().Model(route).Exec(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error creating expression route with ID: %s", route.ID)
	}

	return nil
}

func (store *store) CreateBatch(ctx context.Context, route []*routeTypes.ExpressionRoute) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewInsert().Model(&route).Exec(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error creating expression routes: %v", err)
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgId string, id string) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewDelete().Model((*routeTypes.ExpressionRoute)(nil)).Where("org_id = ?", orgId).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to delete expression route with ID: %s", id)
	}

	return nil
}

func (store *store) GetAllByKindAndOrgID(ctx context.Context, orgID string, kind routeTypes.ExpressionKind) ([]*routeTypes.ExpressionRoute, error) {
	var routes []*routeTypes.ExpressionRoute
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(&routes).Where("org_id = ?", orgID).Where("kind = ?", kind).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.NewNotFoundf(errors.CodeNotFound, "no expression routes found for orgID: %s", orgID)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch expression routes for orgID: %s", orgID)
	}
	return routes, nil
}

func (store *store) GetAllByName(ctx context.Context, orgID string, name string) ([]*routeTypes.ExpressionRoute, error) {
	var routes []*routeTypes.ExpressionRoute
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(&routes).Where("org_id = ?", orgID).Where("name = ?", name).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return routes, errors.NewNotFoundf(errors.CodeNotFound, "no expression routes found for orgID: %s and name: %s", orgID, name)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch expression routes for orgID: %s and name: %s", orgID, name)
	}
	return routes, nil
}

func (store *store) DeleteRouteByName(ctx context.Context, orgID string, name string) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewDelete().Model((*routeTypes.ExpressionRoute)(nil)).Where("org_id = ?", orgID).Where("name = ?", name).Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to delete expression route with name: %s", name)
	}

	return nil
}
