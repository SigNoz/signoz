package implserviceaccount

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store serviceaccounttypes.Store
}

func NewGetter(store serviceaccounttypes.Store) serviceaccount.Getter {
	return &getter{store: store}
}

func (getter *getter) GetServiceAccountsByOrgIDAndRoleID(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) ([]*serviceaccounttypes.ServiceAccount, error) {
	return getter.store.GetServiceAccountsByOrgIDAndRoleID(ctx, orgID, roleID)
}
