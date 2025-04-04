package sqllicensingstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) licensetypes.Store {
	return &store{
		sqlstore: sqlstore,
	}
}

func (store *store) Set(ctx context.Context, license licensetypes.License) error {
	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID) ([]licensetypes.License, error) {
	return nil, nil
}

func (store *store) GetLatest(ctx context.Context, orgID valuer.UUID) (licensetypes.License, error) {
	return nil, nil
}

func (store *store) ListOrgs(ctx context.Context) ([]valuer.UUID, error) {
	return nil, nil
}
