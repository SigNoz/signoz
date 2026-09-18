package sqlalertmanagerstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/uptrace/bun"
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
func (store *state) Set(ctx context.Context, storeableState *alertmanagertypes.StoreableState, stateName alertmanagertypes.StateName) error {
	var column string
	switch stateName {
	case alertmanagertypes.SilenceStateName:
		column = "silences"
	case alertmanagertypes.NFLogStateName:
		column = "nflog"
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown alertmanager state %q", stateName.String())
	}

	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	_, err = tx.
		NewInsert().
		Model(storeableState).
		Column("id", "created_at", "updated_at", "org_id", column).
		On("CONFLICT (org_id) DO UPDATE").
		Set("? = EXCLUDED.?", bun.Ident(column), bun.Ident(column)).
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
