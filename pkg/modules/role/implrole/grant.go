package implrole

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type grant struct {
	store roletypes.Store
	authz authz.AuthZ
}

func NewGrant(store roletypes.Store, authz authz.AuthZ) role.Grant {
	return &grant{store: store, authz: authz}
}

func (grant *grant) Grant(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := grant.store.GetByNameAndOrgID(ctx, name, orgID)
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
	return grant.authz.Write(ctx, tuples, nil)
}

func (grant *grant) ModifyGrant(ctx context.Context, orgID valuer.UUID, existingRoleName string, updatedRoleName string, subject string) error {
	err := grant.Revoke(ctx, orgID, existingRoleName, subject)
	if err != nil {
		return err
	}

	err = grant.Grant(ctx, orgID, updatedRoleName, subject)
	if err != nil {
		return err
	}

	return nil
}

func (grant *grant) Revoke(ctx context.Context, orgID valuer.UUID, name string, subject string) error {
	role, err := grant.store.GetByNameAndOrgID(ctx, name, orgID)
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
	return grant.authz.Write(ctx, nil, tuples)
}
