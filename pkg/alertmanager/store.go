package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagertypes"
	"go.signoz.io/signoz/pkg/errors"
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
	SetState(context.Context, string, alertmanagertypes.StateName, alertmanagertypes.State) (int64, error)

	// Gets the silence state or the notification log state as a string from the store. This is used as a snapshot to load the
	// initial state of silences or notification log when starting the alertmanager.
	GetState(context.Context, string, alertmanagertypes.StateName) (string, error)

	// Deletes the state for an organization
	DelState(context.Context, string, alertmanagertypes.StateName) error

	// Get an alertmanager config for an organization
	GetConfig(context.Context, string) (*alertmanagertypes.Config, error)

	// Set an alertmanager config for an organization
	SetConfig(context.Context, string, *alertmanagertypes.Config) error

	// Deletes the config for an organization
	DelConfig(context.Context, string) error

	// Get all organization ids
	ListOrgIDs(context.Context) ([]string, error)
}
