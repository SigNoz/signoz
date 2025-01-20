package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagertypes"
	"go.signoz.io/signoz/pkg/errors"
)

var (
	ErrCodeAlertmanagerConfigNotFound = errors.MustNewCode("alertmanager_config_not_found")
)

type Store interface {
	// Creates the silence state and returns the number of bytes in the state.
	// The return type matches the return of `silence.Maintenance`.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/silence/silence.go#L217
	CreateSilences(context.Context, alertmanagertypes.State) (int64, error)

	// Gets the silence state as a string from the store. This is used as a snapshot to load the
	// initial state of silences when starting the alertmanager.
	GetSilences(context.Context) (string, error)

	// Creates the notification log state and returns the number of bytes in the state.
	// The return type matches the return of `nflog.Maintenance`.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/nflog/nflog.go#L94
	CreateNFLog(context.Context, alertmanagertypes.State) (int64, error)

	// Gets the notification log state as a string from the store. This is used as a snapshot to load the
	// initial state of notification log when starting the alertmanager.
	GetNFLog(context.Context) (string, error)

	// Get an alertmanager config for an organization
	GetConfig(context.Context, string) (*alertmanagertypes.Config, error)
}
