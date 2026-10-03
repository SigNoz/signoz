package sqlalertmanagerstore

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
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
func (store *state) Set(ctx context.Context, storeableState *alertmanagertypes.StoreableState) error {
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
		Exec(ctx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func NewAlertThreadStore(sqlstore sqlstore.SQLStore) alertmanagertypes.AlertThreadStore {
	return &state{sqlstore: sqlstore}
}

// GetThreadTs implements alertmanagertypes.AlertThreadStore.
func (store *state) GetThreadTs(ctx context.Context, orgID string, groupKey string) (string, error) {
	thread := new(alertmanagertypes.SlackAlertThread)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(thread).
		Where("org_id = ? AND group_key = ?", orgID, groupKey).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return thread.ThreadTs, nil
}

// SetThreadTs implements alertmanagertypes.AlertThreadStore.
func (store *state) SetThreadTs(ctx context.Context, orgID string, groupKey string, threadTs string) error {
	thread := &alertmanagertypes.SlackAlertThread{
		OrgID:     orgID,
		GroupKey:  groupKey,
		ThreadTs:  threadTs,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	_, err = tx.
		NewInsert().
		Model(thread).
		On("CONFLICT (group_key) DO UPDATE").
		Set("thread_ts = EXCLUDED.thread_ts").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteThread implements alertmanagertypes.AlertThreadStore.
func (store *state) DeleteThread(ctx context.Context, orgID string, groupKey string) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model((*alertmanagertypes.SlackAlertThread)(nil)).
		Where("org_id = ? AND group_key = ?", orgID, groupKey).
		Exec(ctx)
	return err
}
