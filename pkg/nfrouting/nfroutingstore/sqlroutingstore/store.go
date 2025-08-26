package sqlroutingstore

import (
	"context"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	routeTypes "github.com/SigNoz/signoz/pkg/types/routingtypes"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) routeTypes.RouteStore {
	return &store{
		sqlstore: sqlstore,
	}
}

func (store *store) GetAll(ctx context.Context) ([]routeTypes.ExpressionRoutes, error) {
	var routes []routeTypes.ExpressionRoute
	err := store.sqlstore.BunDB().NewSelect().Model(&routes).Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "unable to fetch expression routes")
	}

	result := make([]routeTypes.ExpressionRoutes, len(routes))
	for i, route := range routes {
		result[i] = routeTypes.ExpressionRoutes{
			Expression: route.Expression,
			Actions: routeTypes.Actions{
				Channels: route.Channels,
				Priority: route.Priority,
			},
		}
	}

	return result, nil
}
func (store *store) GetByID(ctx context.Context, id string) (*routeTypes.ExpressionRoute, error) {
	route := new(routeTypes.ExpressionRoute)
	err := store.sqlstore.BunDB().NewSelect().Model(route).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "expression route with ID: %s does not exist", id)
	}

	return route, nil
}
func (store *store) Create(ctx context.Context, route *routeTypes.ExpressionRoute) error {
	_, err := store.sqlstore.BunDB().NewInsert().Model(route).Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "expression route with ID: %s already exists", route.ID)
	}

	return nil
}
func (store *store) Update(ctx context.Context, route *routeTypes.ExpressionRoute) error {
	_, err := store.sqlstore.BunDB().NewUpdate().Model(route).WherePK().Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to update expression route with ID: %s", route.ID)
	}

	return nil
}
func (store *store) Delete(ctx context.Context, id string) error {
	_, err := store.sqlstore.BunDB().NewDelete().Model((*routeTypes.ExpressionRoute)(nil)).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to delete expression route with ID: %s", id)
	}

	return nil
}

func (store *store) GetAllByOrgID(ctx context.Context, orgID string) ([]routeTypes.ExpressionRoutes, error) {
	var routes []routeTypes.ExpressionRoute
	err := store.sqlstore.BunDB().NewSelect().Model(&routes).Where("org_id = ?", orgID).Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "unable to fetch expression routes for orgID: %s", orgID)
	}
	result := make([]routeTypes.ExpressionRoutes, len(routes))
	for i, route := range routes {
		result[i] = routeTypes.ExpressionRoutes{
			Expression: route.Expression,
			Actions: routeTypes.Actions{
				Channels: route.Channels,
				Priority: route.Priority,
			},
		}
	}
	return result, nil
}
