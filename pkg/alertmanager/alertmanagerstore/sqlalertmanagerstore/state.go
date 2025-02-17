package sqlalertmanagerstore

import (
	"context"
	"database/sql"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type state struct {
	sqlstore sqlstore.SQLStore
}

func NewStateStore(sqlstore sqlstore.SQLStore) alertmanagertypes.StateStore {
	return &state{sqlstore: sqlstore}
}

// Get implements alertmanagertypes.StateStore.
func (store *state) Get(ctx context.Context, orgID string) (*alertmanagertypes.StoreableState, error) {
	storeableState := new(alertmanagertypes.StoreableState)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storeableState).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "cannot find alertmanager state for org %s", orgID)
		}

		return nil, err
	}

	return storeableState, nil
}

// Set implements alertmanagertypes.StateStore.
func (store *state) Set(ctx context.Context, orgID string, storeableState *alertmanagertypes.StoreableState) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	_, err = tx.
		NewInsert().
		Model(storeableState).
		On("CONFLICT (org_id) DO UPDATE").
		Set("silences = EXCLUDED.silences").
		Set("nflog = EXCLUDED.nflog").
		Set("updated_at = EXCLUDED.updated_at").
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
