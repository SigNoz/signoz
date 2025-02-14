package alertmanagertypes

import (
	"context"

	"github.com/prometheus/alertmanager/cluster"
	"go.signoz.io/signoz/pkg/errors"
)

// State is the type alias for the State type from the alertmanager package.
type State = cluster.State

var (
	// SilenceStateName is the name of the silence state.
	SilenceStateName = StateName{name: "silence"}

	// NFLogStateName is the name of the nflog state.
	NFLogStateName = StateName{name: "nflog"}
)

var (
	ErrCodeAlertmanagerStateNotFound    = errors.MustNewCode("alertmanager_state_not_found")
	ErrCodeAlertmanagerStateNameInvalid = errors.MustNewCode("alertmanager_state_name_invalid")
)

type StateName struct {
	name string
}

func (s StateName) String() string {
	return s.name
}

type StateStore interface {
	// Creates the silence or the notification log state and returns the number of bytes in the state.
	// The return type matches the return of `silence.Maintenance` or `nflog.Maintenance`.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/silence/silence.go#L217
	// and https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/nflog/nflog.go#L94
	Set(context.Context, string, StateName, State) (int64, error)

	// Gets the silence state or the notification log state as a string from the store. This is used as a snapshot to load the
	// initial state of silences or notification log when starting the alertmanager.
	Get(context.Context, string, StateName) (string, error)
}
