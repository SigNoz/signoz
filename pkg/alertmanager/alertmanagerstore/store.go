package alertmanagerstore

import (
	"context"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var (
	ErrCodeAlertmanagerConfigNotFound = errors.MustNewCode("alertmanager_config_not_found")
	ErrCodeAlertmanagerStateNotFound  = errors.MustNewCode("alertmanager_state_not_found")
)

type Store interface {
	// Creates the silence or the notification log state and returns the number of bytes in the state.
	// The return type matches the return of `silence.Maintenance` or `nflog.Maintenance`.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/silence/silence.go#L217
	// and https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/nflog/nflog.go#L94
	SetState(context.Context, uint64, alertmanagertypes.StateName, alertmanagertypes.State) (int64, error)

	// Gets the silence state or the notification log state as a string from the store. This is used as a snapshot to load the
	// initial state of silences or notification log when starting the alertmanager.
	GetState(context.Context, uint64, alertmanagertypes.StateName) (string, error)

	// Get an alertmanager config for an organization
	GetConfig(context.Context, uint64) (*alertmanagertypes.Config, error)

	// Set an alertmanager config for an organization
	SetConfig(context.Context, uint64, *alertmanagertypes.Config) error

	// Deletes the config for an organization
	DelConfig(context.Context, uint64) error

	// Get all organization ids
	ListOrgIDs(context.Context) ([]uint64, error)
}
