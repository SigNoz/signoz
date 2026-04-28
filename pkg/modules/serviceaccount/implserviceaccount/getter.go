package implserviceaccount

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store serviceaccounttypes.Store
}

func NewGetter(store serviceaccounttypes.Store) serviceaccount.Getter {
	return &getter{store: store}
}

func (getter *getter) OnBeforeRoleDelete(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) error {
	serviceAccounts, err := getter.store.GetServiceAccountsByOrgIDAndRoleID(ctx, orgID, roleID)
	if err != nil {
		return err
	}
	if len(serviceAccounts) > 0 {
		return errors.New(errors.TypeInvalidInput, authtypes.ErrCodeRoleHasServiceAccountAssignees, "role has active service account assignments, remove them before deleting")
	}
	return nil
}
