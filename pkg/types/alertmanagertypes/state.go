package alertmanagertypes

import (
	"context"
	"encoding/base64"
	"time"

	"github.com/prometheus/alertmanager/cluster"
	"github.com/uptrace/bun"
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
	ErrCodeAlertmanagerStateNotFound = errors.MustNewCode("alertmanager_state_not_found")
)

type StoreableState struct {
	bun.BaseModel `bun:"table:alertmanager_state"`

	ID        uint64    `bun:"id,pk,autoincrement"`
	Silences  string    `bun:"silences,nullzero"`
	NFLog     string    `bun:"nflog,nullzero"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	OrgID     string    `bun:"org_id"`
}

func NewStoreableState(orgID string) *StoreableState {
	return &StoreableState{
		OrgID:     orgID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func (s *StoreableState) Set(stateName StateName, state State) (int64, error) {
	marshalledState, err := state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	encodedState := base64.StdEncoding.EncodeToString(marshalledState)

	switch stateName {
	case SilenceStateName:
		s.Silences = encodedState
	case NFLogStateName:
		s.NFLog = encodedState
	}

	s.UpdatedAt = time.Now()

	return int64(len(marshalledState)), nil
}

func (s *StoreableState) Get(stateName StateName) (string, error) {
	base64encodedState := ""

	switch stateName {
	case SilenceStateName:
		base64encodedState = s.Silences
	case NFLogStateName:
		base64encodedState = s.NFLog
	}

	if base64encodedState == "" {
		return "", errors.New(errors.TypeNotFound, ErrCodeAlertmanagerStateNotFound, "state not found")
	}

	decodedState, err := base64.StdEncoding.DecodeString(base64encodedState)
	if err != nil {
		return "", err
	}

	return string(decodedState), nil
}

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
	Set(context.Context, string, *StoreableState) error

	// Gets the silence state or the notification log state as a string from the store. This is used as a snapshot to load the
	// initial state of silences or notification log when starting the alertmanager.
	Get(context.Context, string) (*StoreableState, error)
}
