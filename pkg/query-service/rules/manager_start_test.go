package rules

import (
	"context"
	"errors"
	"testing"

	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

type stubOrgGetter struct {
	orgs []*types.Organization
	err  error
}

func (s *stubOrgGetter) Get(context.Context, valuer.UUID) (*types.Organization, error) {
	return nil, s.err
}

func (s *stubOrgGetter) GetByIDOrName(context.Context, valuer.UUID, string) (*types.Organization, bool, error) {
	return nil, false, s.err
}

func (s *stubOrgGetter) ListByOwnedKeyRange(context.Context) ([]*types.Organization, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.orgs, nil
}

func (s *stubOrgGetter) GetByName(context.Context, string) (*types.Organization, error) {
	return nil, s.err
}

var _ organization.Getter = (*stubOrgGetter)(nil)

func TestManager_Start_PropagatesInitiateError(t *testing.T) {
	boom := errors.New("telemetry store unreachable")
	mgr := NewTestManager(t, &TestManagerOptions{
		ManagerOptionsHook: func(opts *ManagerOptions) {
			opts.OrgGetter = &stubOrgGetter{err: boom}
		},
	})

	err := mgr.Start(context.Background())
	require.ErrorIs(t, err, boom)

	select {
	case <-mgr.block:
		t.Fatal("run must not unblock tasks when initiate fails")
	default:
	}
}

func TestManager_Start_SucceedsWhenInitiateSucceeds(t *testing.T) {
	mgr := NewTestManager(t, &TestManagerOptions{
		ManagerOptionsHook: func(opts *ManagerOptions) {
			opts.OrgGetter = &stubOrgGetter{orgs: []*types.Organization{}}
		},
	})

	require.NoError(t, mgr.Start(context.Background()))

	select {
	case <-mgr.block:
	default:
		t.Fatal("run must unblock tasks once initiate succeeds")
	}
}
