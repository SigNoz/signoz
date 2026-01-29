package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type granter struct {
	store roletypes.Store
	authz authz.AuthZ
}

func NewGranter(store roletypes.Store, authz authz.AuthZ) role.Granter {
	return &granter{store: store, authz: authz}
}

func (granter *granter) Grant(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := granter.store.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return err
	}

	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, role.ID.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return granter.authz.Write(ctx, tuples, nil)
}

func (granter *granter) GrantByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID, subject string) error {
	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, id.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return granter.authz.Write(ctx, tuples, nil)
}

func (granter *granter) ModifyGrant(ctx context.Context, orgID valuer.UUID, existingRoleName string, updatedRoleName string, subject string) error {
	err := granter.Revoke(ctx, orgID, existingRoleName, subject)
	if err != nil {
		return err
	}

	err = granter.Grant(ctx, orgID, updatedRoleName, subject)
	if err != nil {
		return err
	}

	return nil
}

func (granter *granter) Revoke(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := granter.store.GetByOrgIDAndName(ctx, orgID, name)
	if err != nil {
		return err
	}

	tuples, err := authtypes.TypeableRole.Tuples(
		subject,
		authtypes.RelationAssignee,
		[]authtypes.Selector{
			authtypes.MustNewSelector(authtypes.TypeRole, role.ID.StringValue()),
		},
		orgID,
	)
	if err != nil {
		return err
	}
	return granter.authz.Write(ctx, nil, tuples)
}

func (granter *granter) CreateManagedRoles(ctx context.Context, _ valuer.UUID, managedRoles []*roletypes.Role) error {
	err := granter.store.RunInTx(ctx, func(ctx context.Context) error {
		for _, role := range managedRoles {
			err := granter.store.Create(ctx, roletypes.NewStorableRoleFromRole(role))
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}
