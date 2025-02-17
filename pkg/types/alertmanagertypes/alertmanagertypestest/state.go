package alertmanagertypestest

import (
	"context"
	"sync"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
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

func (s *StateStore) Set(ctx context.Context, orgID string, storeableState *alertmanagertypes.StoreableState) error {
	s.mtx.Lock()
	s.states[orgID] = storeableState
	s.mtx.Unlock()
	return nil
}

func (s *StateStore) Get(ctx context.Context, orgID string) (*alertmanagertypes.StoreableState, error) {
	if _, ok := s.states[orgID]; !ok {
		return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "state for orgID %q not found", orgID)
	}

	return s.states[orgID], nil
}
