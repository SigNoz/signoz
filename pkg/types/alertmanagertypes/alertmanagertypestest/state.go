package alertmanagertypestest

import (
	"context"
	"encoding/base64"
	"sync"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type StateStore struct {
	states map[string]map[string]string
	mtx    sync.RWMutex
}

func NewStateStore() *StateStore {
	return &StateStore{
		states: make(map[string]map[string]string),
	}
}

func (s *StateStore) Set(ctx context.Context, orgID string, stateName alertmanagertypes.StateName, state alertmanagertypes.State) (int64, error) {
	if _, ok := s.states[orgID]; !ok {
		s.states[orgID] = make(map[string]string)
	}

	bytes, err := state.MarshalBinary()
	if err != nil {
		return 0, err
	}

	s.mtx.Lock()
	s.states[orgID][stateName.String()] = base64.StdEncoding.EncodeToString(bytes)
	s.mtx.Unlock()
	return int64(len(bytes)), nil
}

func (s *StateStore) Get(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) (string, error) {
	if _, ok := s.states[orgID]; !ok {
		return "", errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "state %q for orgID %q not found", stateName.String(), orgID)
	}

	state, ok := s.states[orgID][stateName.String()]
	if !ok {
		return "", errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "state %q for orgID %q not found", stateName.String(), orgID)
	}

	bytes, err := base64.StdEncoding.DecodeString(state)
	if err != nil {
		return "", err
	}

	return string(bytes), nil
}
