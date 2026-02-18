package implidentity

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/identitytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func newStore(sqlstore sqlstore.SQLStore) *store {
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

func (s *store) GetRolesByIdentityID(ctx context.Context, identityID valuer.UUID) ([]string, error) {
	var roleNames []string
	err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model((*identitytypes.StorableIdentityRole)(nil)).
		Column("role_name").
		Where("identity_id = ?", identityID).
		Scan(ctx, &roleNames)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get roles for identity %s", identityID)
	}
	return roleNames, nil
}

func (s *store) GetRolesForIdentityIDs(ctx context.Context, identityIDs []valuer.UUID) (map[string][]string, error) {
	if len(identityIDs) == 0 {
		return map[string][]string{}, nil
	}

	var results []identitytypes.StorableIdentityRole
	err := s.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&results).
		Column("identity_id", "role_name").
		Where("identity_id IN (?)", bun.In(identityIDs)).
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get roles for identities")
	}

	roleMap := make(map[string][]string)
	for _, r := range results {
		roleMap[r.IdentityID.StringValue()] = append(roleMap[r.IdentityID.StringValue()], r.RoleName)
	}

	return roleMap, nil
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
