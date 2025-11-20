package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) roletypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, role *roletypes.StorableRole) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(role).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "role with id: %s already exists", role.ID)
	}

	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*roletypes.StorableRole, error) {
	role := new(roletypes.StorableRole)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(role).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, roletypes.ErrCodeRoleNotFound, "role with id: %s doesn't exist", id)
	}

	return role, nil
}

func (store *store) GetByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*roletypes.StorableRole, error) {
	role := new(roletypes.StorableRole)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(role).
		Where("org_id = ?", orgID).
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, roletypes.ErrCodeRoleNotFound, "role with name: %s doesn't exist", name)
	}

	return role, nil
}

func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.StorableRole, error) {
	roles := make([]*roletypes.StorableRole, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&roles).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, roletypes.ErrCodeRoleNotFound, "no roles found in org_id: %s", orgID)
	}

	return roles, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, role *roletypes.StorableRole) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(role).
		WherePK().
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, errors.CodeAlreadyExists, "role with id %s doesn't exist", role.ID)
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model(new(roletypes.StorableRole)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, roletypes.ErrCodeRoleNotFound, "role with id %s doesn't exist", id)
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
