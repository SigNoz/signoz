package sqlalertmanagerstore

import (
	"context"
	"database/sql"
	"encoding/base64"
	"time"

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
func (store *state) Get(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) (string, error) {
	storeableConfig := new(alertmanagertypes.StoreableConfig)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storeableConfig).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "cannot find alertmanager state for org %s", orgID)
		}

		return "", err
	}

	if stateName == alertmanagertypes.SilenceStateName {
		decodedState, err := base64.RawStdEncoding.DecodeString(storeableConfig.SilencesState)
		if err != nil {
			return "", err
		}

		return string(decodedState), nil
	}

	if stateName == alertmanagertypes.NFLogStateName {
		decodedState, err := base64.RawStdEncoding.DecodeString(storeableConfig.NFLogState)
		if err != nil {
			return "", err
		}

		return string(decodedState), nil
	}

	// This should never happen
	return "", errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNameInvalid, "cannot find state with name %s for org %s", stateName.String(), orgID)
}

// Set implements alertmanagertypes.StateStore.
func (store *state) Set(ctx context.Context, orgID string, stateName alertmanagertypes.StateName, state alertmanagertypes.State) (int64, error) {
	storeableConfig := new(alertmanagertypes.StoreableConfig)

	marshalledState, err := state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	encodedState := base64.StdEncoding.EncodeToString(marshalledState)

	q := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storeableConfig).
		Set("updated_at = ?", time.Now()).
		Where("org_id = ?", orgID)

	if stateName == alertmanagertypes.SilenceStateName {
		q.Set("silences_state = ?", encodedState)
	}

	if stateName == alertmanagertypes.NFLogStateName {
		q.Set("nflog_state = ?", encodedState)
	}

	_, err = q.Exec(ctx)
	if err != nil {
		return 0, err
	}

	return int64(len(marshalledState)), nil
}
