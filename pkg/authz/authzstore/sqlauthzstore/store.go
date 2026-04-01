package sqlauthzstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewSqlAuthzStore(sqlstore sqlstore.SQLStore) authtypes.RoleStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, role *authtypes.StorableRole) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(role).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "role with name: %s already exists", role.Name)
	}

	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*authtypes.StorableRole, error) {
	role := new(authtypes.StorableRole)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(role).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeRoleNotFound, "role with id: %s doesn't exist", id)
	}

	return role, nil
}

func (store *store) GetByOrgIDAndName(ctx context.Context, orgID valuer.UUID, name string) (*authtypes.StorableRole, error) {
	role := new(authtypes.StorableRole)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(role).
		Where("org_id = ?", orgID).
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeRoleNotFound, "role with name: %s doesn't exist", name)
	}

	return role, nil
}

func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*authtypes.StorableRole, error) {
	roles := make([]*authtypes.StorableRole, 0)
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

func (store *store) ListByOrgIDAndNames(ctx context.Context, orgID valuer.UUID, names []string) ([]*authtypes.StorableRole, error) {
	roles := make([]*authtypes.StorableRole, 0)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&roles).
		Where("org_id = ?", orgID).
		Where("name IN (?)", bun.In(names)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	if len(roles) != len(names) {
		return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeRoleNotFound, "not all roles found for the provided names: %v", names)
	}

	return roles, nil
}

func (store *store) ListByOrgIDAndIDs(ctx context.Context, orgID valuer.UUID, ids []valuer.UUID) ([]*authtypes.StorableRole, error) {
	roles := make([]*authtypes.StorableRole, 0)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&roles).
		Where("org_id = ?", orgID).
		Where("id IN (?)", bun.In(ids)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	if len(roles) != len(ids) {
		return nil, errors.Newf(errors.TypeInvalidInput, authtypes.ErrCodeRoleNotFound, "not all roles found for the provided names: %v", ids)
	}

	return roles, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, role *authtypes.StorableRole) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
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
		BunDBCtx(ctx).
		NewDelete().
		Model(new(authtypes.StorableRole)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, authtypes.ErrCodeRoleNotFound, "role with id %s doesn't exist", id)
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
