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

func (store *store) GetByID(ctx context.Context, orgId string, id string) (*routeTypes.RoutePolicy, error) {
	route := new(routeTypes.RoutePolicy)
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(route).Where("id = ?", id).Where("org_id = ?", orgId).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "routing policy with ID: %s does not exist", id)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch routing policy with ID: %s", id)
	}

	return route, nil
}

func (store *store) Create(ctx context.Context, route *routeTypes.RoutePolicy) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewInsert().Model(route).Exec(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error creating routing policy with ID: %s", route.ID)
	}

	return nil
}

func (store *store) CreateBatch(ctx context.Context, route []*routeTypes.RoutePolicy) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewInsert().Model(&route).Exec(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error creating routing policies: %v", err)
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgId string, id string) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewDelete().Model((*routeTypes.RoutePolicy)(nil)).Where("org_id = ?", orgId).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to delete routing policy with ID: %s", id)
	}

	return nil
}

func (store *store) GetAllByKind(ctx context.Context, orgID string, kind routeTypes.ExpressionKind) ([]*routeTypes.RoutePolicy, error) {
	var routes []*routeTypes.RoutePolicy
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(&routes).Where("org_id = ?", orgID).Where("kind = ?", kind).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.NewNotFoundf(errors.CodeNotFound, "no routing policies found for orgID: %s", orgID)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch routing policies for orgID: %s", orgID)
	}
	return routes, nil
}

func (store *store) GetAllByName(ctx context.Context, orgID string, name string) ([]*routeTypes.RoutePolicy, error) {
	var routes []*routeTypes.RoutePolicy
	err := store.sqlstore.BunDBCtx(ctx).NewSelect().Model(&routes).Where("org_id = ?", orgID).Where("name = ?", name).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return routes, errors.NewNotFoundf(errors.CodeNotFound, "no routing policies found for orgID: %s and name: %s", orgID, name)
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to fetch routing policies for orgID: %s and name: %s", orgID, name)
	}
	return routes, nil
}

func (store *store) DeleteRouteByName(ctx context.Context, orgID string, name string) error {
	_, err := store.sqlstore.BunDBCtx(ctx).NewDelete().Model((*routeTypes.RoutePolicy)(nil)).Where("org_id = ?", orgID).Where("name = ?", name).Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to delete routing policies with name: %s", name)
	}

	return nil
}
