package implserviceaccount

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) serviceaccounttypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(context.Context, *serviceaccounttypes.StorableServiceAccount) error {
	panic("unimplemented")
}

func (store *store) Get(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.StorableServiceAccount, error) {
	panic("unimplemented")
}

func (store *store) List(context.Context, valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccount, error) {
	panic("unimplemented")
}

func (store *store) Update(context.Context, valuer.UUID, *serviceaccounttypes.StorableServiceAccount) error {
	panic("unimplemented")
}

func (store *store) Delete(context.Context, valuer.UUID, valuer.UUID) error {
	panic("unimplemented")
}

func (store *store) CreateServiceAccountRoles(context.Context, []*serviceaccounttypes.StorableServiceAccountRole) error {
	panic("unimplemented")
}

func (store *store) GetServiceAccountRoles(context.Context, valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccountRole, error) {
	panic("unimplemented")
}

func (store *store) ListServiceAccountRolesByOrgID(context.Context, valuer.UUID) ([]*serviceaccounttypes.StorableServiceAccountRole, error) {
	panic("unimplemented")
}

func (store *store) DeleteServiceAccountRoles(context.Context, valuer.UUID) error {
	panic("unimplemented")
}

func (store *store) CreateFactorAPIKey(context.Context, *serviceaccounttypes.StorableFactorAPIKey) error {
	panic("unimplemented")
}

func (store *store) GetFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) (*serviceaccounttypes.StorableFactorAPIKey, error) {
	panic("unimplemented")
}

func (store *store) ListFactorAPIKey(context.Context, valuer.UUID) ([]*serviceaccounttypes.StorableFactorAPIKey, error) {
	panic("unimplemented")
}

func (store *store) UpdateFactorAPIKey(context.Context, *serviceaccounttypes.StorableFactorAPIKey) error {
	panic("unimplemented")
}

func (store *store) RevokeFactorAPIKey(context.Context, valuer.UUID, valuer.UUID) error {
	panic("unimplemented")
}

func (store *store) RunInTx(ctx context.Context, cb func(context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
