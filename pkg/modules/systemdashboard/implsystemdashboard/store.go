package implsystemdashboard

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) systemdashboardtypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, storable *systemdashboardtypes.StorableSystemDashboard) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, systemdashboardtypes.ErrCodeSystemDashboardAlreadyProvisioned, "system dashboard %s is already provisioned", storable.Name)
	}

	return nil
}

func (store *store) Get(ctx context.Context, orgID valuer.UUID, name string) (*systemdashboardtypes.StorableSystemDashboard, error) {
	storable := new(systemdashboardtypes.StorableSystemDashboard)
	err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("org_id = ?", orgID).
		Where("name = ?", name).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, systemdashboardtypes.ErrCodeSystemDashboardNotFound, "system dashboard %s is not provisioned", name)
	}

	return storable, nil
}

func (store *store) UpdateVersion(ctx context.Context, orgID valuer.UUID, name string, version int) error {
	result, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(new(systemdashboardtypes.StorableSystemDashboard)).
		Set("version = ?", version).
		Set("updated_at = ?", time.Now()).
		Where("org_id = ?", orgID).
		Where("name = ?", name).
		Exec(ctx)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.Newf(errors.TypeNotFound, systemdashboardtypes.ErrCodeSystemDashboardNotFound, "system dashboard %s is not provisioned", name)
	}

	return nil
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.sqlstore.RunInTxCtx(ctx, nil, cb)
}
