package openfgaauthz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) authz.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) ListRolesByOrgID(ctx context.Context, orgID valuer.UUID) ([]*roletypes.StorableRole, error) {
	roles := make([]*roletypes.StorableRole, 0)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&roles).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return roles, nil
}

func (store *store) ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.User, error) {
	users := []*types.User{}

	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&users).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}
