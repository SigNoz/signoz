package alertmanagertypestest

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

var _ alertmanagertypes.StateStore = (*StateStore)(nil)

type StateStore struct {
	states map[string]*alertmanagertypes.StoreableState
	mtx    sync.RWMutex
}

func NewStateStore() *StateStore {
	return &StateStore{
		states: make(map[string]*alertmanagertypes.StoreableState),
	}
}

func (s *StateStore) Set(ctx context.Context, storeableState *alertmanagertypes.StoreableState, stateName alertmanagertypes.StateName) error {
	s.mtx.Lock()
	defer s.mtx.Unlock()

	stored, ok := s.states[storeableState.OrgID]
	if !ok {
		copy := *storeableState
		copy.Silences = ""
		copy.NFLog = ""
		stored = &copy
	}
	switch stateName {
	case alertmanagertypes.SilenceStateName:
		stored.Silences = storeableState.Silences
	case alertmanagertypes.NFLogStateName:
		stored.NFLog = storeableState.NFLog
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown alertmanager state %q", stateName.String())
	}
	stored.UpdatedAt = storeableState.UpdatedAt
	s.states[storeableState.OrgID] = stored
	return nil
}

func (s *StateStore) Get(ctx context.Context, orgID string) (*alertmanagertypes.StoreableState, error) {
	s.mtx.RLock()
	defer s.mtx.RUnlock()
	if _, ok := s.states[orgID]; !ok {
		return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "state for orgID %q not found", orgID)
	}

	copy := *s.states[orgID]
	return &copy, nil
}
