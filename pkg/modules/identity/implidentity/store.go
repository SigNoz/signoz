package implidentity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/identitytypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) identitytypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) CreateIdentity(ctx context.Context, identity *identitytypes.StorableIdentity) error {
	_, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(identity).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create identity")
	}
	return nil
}

func (s *store) CreateIdentityRole(ctx context.Context, identityRole *identitytypes.StorableIdentityRole) error {
	_, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(identityRole).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create identity role")
	}
	return nil
}

func (s *store) DeleteIdentityRole(ctx context.Context, identityID valuer.UUID, roleName string) error {
	_, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(&identitytypes.StorableIdentityRole{}).
		Where("identity_id = ?", identityID).
		Where("role_name = ?", roleName).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete identity role")
	}
	return nil
}

func (s *store) DeleteIdentityRoles(ctx context.Context, identityID valuer.UUID) error {
	_, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(&identitytypes.StorableIdentityRole{}).
		Where("identity_id = ?", identityID).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete identity roles")
	}
	return nil
}

func (s *store) DeleteIdentity(ctx context.Context, identityID valuer.UUID) error {
	_, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model(&identitytypes.StorableIdentity{}).
		Where("id = ?", identityID).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete identity")
	}
	return nil
}

func (s *store) GetRolesByIdentityID(ctx context.Context, identityID valuer.UUID) ([]*roletypes.StorableRole, error) {
	var roles []*roletypes.StorableRole
	err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&roles).
		Join("JOIN identity_role ON identity_role.role_name = role.name").
		Where("identity_role.identity_id = ?", identityID).
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get roles for identity %s", identityID)
	}
	return roles, nil
}

func (s *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return s.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}

func (s *store) CountByRoleNameAndOrgID(ctx context.Context, roleName string, orgID valuer.UUID) (int64, error) {
	count, err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model((*identitytypes.StorableIdentityRole)(nil)).
		Join("JOIN identity ON identity.id = identity_role.identity_id").
		Where("identity_role.role_name = ?", roleName).
		Where("identity.org_id = ?", orgID).
		Count(ctx)
	if err != nil {
		return 0, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to count identities by role")
	}
	return int64(count), nil
}
