package implrole

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
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
		BunDBCtx(ctx).
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
		BunDBCtx(ctx).
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

func (store *store) GetMembership(ctx context.Context, id valuer.UUID) (*roletypes.StorableMembership, error) {
	storableUserMembership := make([]*roletypes.StorableUserRole, 0)
	err := store.RunInTx(ctx, func(ctx context.Context) error {
		err := store.sqlstore.
			BunDBCtx(ctx).
			NewSelect().
			Model(&storableUserMembership).
			Relation("User").
			Where("role_id = ?", id).
			Scan(ctx)
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return roletypes.MakeStorableMembership(storableUserMembership)
}

func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*roletypes.StorableRole, error) {
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

func (store *store) ListMembershipAttributes(ctx context.Context, orgID valuer.UUID) (map[string]*roletypes.Attributes, error) {
	type resultRow struct {
		RoleID    string `bun:"role_id"`
		UserCount int64  `bun:"user_count"`
	}

	var rows []resultRow

	// Count users per role for the org
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model((*roletypes.StorableUserRole)(nil)).
		Column("role_id").
		ColumnExpr("count(*) as user_count").
		Join("JOIN role ON role.id = user_role.role_id").
		Where("role.org_id = ?", orgID).
		Group("role_id").
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	// Map of role_id -> Attributes{UserCount}
	attrMap := make(map[string]*roletypes.Attributes, len(rows))
	for _, row := range rows {
		attrMap[row.RoleID] = &roletypes.Attributes{
			UserCount: row.UserCount,
		}
	}

	return attrMap, nil
}

func (store *store) ListUserByRole(ctx context.Context, id valuer.UUID) ([]*types.User, error) {
	users := make([]*types.User, 0)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&users).
		Join("user_role").
		JoinOn("users.id = user_role.user_id").
		Where("user_role.role_id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, role *roletypes.StorableRole) error {
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

func (store *store) UpdateMembership(ctx context.Context, id valuer.UUID, storableMembership *roletypes.StorableMembership) error {
	err := store.RunInTx(ctx, func(ctx context.Context) error {
		_, err := store.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(roletypes.StorableUserRole)).
			Where("role_id = ?", id).
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = store.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(&storableMembership.Users).
			Exec(ctx)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
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

func (store *store) DeleteMembership(ctx context.Context, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(new(roletypes.StorableUserRole)).
		Where("role_id = ?", id).
		Exec(ctx)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
