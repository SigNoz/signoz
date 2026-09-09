package alertmanager

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/goleak"
)

type lifecycleOrgGetter struct {
	organization.Getter
	list func(context.Context) ([]*types.Organization, error)
}

func (g *lifecycleOrgGetter) ListByOwnedKeyRange(ctx context.Context) ([]*types.Organization, error) {
	return g.list(ctx)
}

type lifecycleConfigStore struct {
	alertmanagertypes.ConfigStore
	config          alertmanagerserver.Config
	beforeGet       func()
	listChannelsErr error
	setErr          error
	stale           bool
}

func (s *lifecycleConfigStore) Get(_ context.Context, orgID string) (*alertmanagertypes.Config, error) {
	if s.beforeGet != nil {
		s.beforeGet()
	}
	config, err := alertmanagertypes.NewDefaultConfig(s.config.Global, s.config.Route, orgID)
	if err != nil {
		return nil, err
	}
	if s.stale {
		config.StoreableConfig().Hash = "stale"
	}
	return alertmanagertypes.NewConfigFromStoreableConfig(config.StoreableConfig())
}

func (s *lifecycleConfigStore) Set(context.Context, *alertmanagertypes.Config, ...alertmanagertypes.StoreOption) error {
	return s.setErr
}

func (s *lifecycleConfigStore) ListChannels(context.Context, string) ([]*alertmanagertypes.Channel, error) {
	return []*alertmanagertypes.Channel{}, s.listChannelsErr
}

func (*lifecycleConfigStore) GetMatchers(context.Context, string) (map[string][]string, error) {
	return map[string][]string{}, nil
}

type lifecycleStateStore struct {
	writes    atomic.Int64
	beforeSet func()
}

func (*lifecycleStateStore) Get(context.Context, string) (*alertmanagertypes.StoreableState, error) {
	return nil, errors.New(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerStateNotFound, "no snapshot")
}

func (s *lifecycleStateStore) Set(ctx context.Context, _ *alertmanagertypes.StoreableState) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if s.beforeSet != nil {
		s.beforeSet()
	}
	s.writes.Add(1)
	return nil
}

func newLifecycleService(t *testing.T, getter organization.Getter) (*Service, *lifecycleStateStore) {
	t.Helper()
	config := alertmanagerserver.NewConfig()
	config.Templates = nil
	state := &lifecycleStateStore{}
	settings := factorytest.NewSettings()
	settings.Logger = slog.New(slog.NewTextHandler(t.Output(), nil))
	return New(
		factory.NewScopedProviderSettings(settings, "alertmanager-test"),
		config, state, &lifecycleConfigStore{config: config}, getter, nfmanagertest.NewMock(), nil,
	), state
}

func awaitLifecycleResult(t *testing.T, done <-chan error) {
	t.Helper()
	select {
	case err := <-done:
		require.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("lifecycle operation did not finish")
	}
}

func TestServiceDoesNotSyncAfterStop(t *testing.T) {
	var calls atomic.Int64
	service, _ := newLifecycleService(t, &lifecycleOrgGetter{
		list: func(context.Context) ([]*types.Organization, error) {
			calls.Add(1)
			return []*types.Organization{}, nil
		},
	})

	require.NoError(t, service.Stop(context.Background()))
	require.NoError(t, service.SyncServers(context.Background()))
	assert.Zero(t, calls.Load(), "a stopped service must not start another synchronization")
}

func TestServiceStopWaitsForInitialSync(t *testing.T) {
	baseline := goleak.IgnoreCurrent()
	t.Cleanup(func() { goleak.VerifyNone(t, baseline) })
	entered := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	unblock := func() { releaseOnce.Do(func() { close(release) }) }
	org := types.NewOrganization("test", "test")
	service, state := newLifecycleService(t, &lifecycleOrgGetter{
		list: func(context.Context) ([]*types.Organization, error) {
			close(entered)
			<-release
			return []*types.Organization{org}, nil
		},
	})
	t.Cleanup(func() {
		unblock()
		require.NoError(t, service.Stop(context.Background()))
	})

	synced := make(chan error, 1)
	go func() { synced <- service.SyncServers(context.Background()) }()
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("synchronization did not reach organization lookup")
	}

	stopped := make(chan error, 1)
	go func() { stopped <- service.Stop(context.Background()) }()
	earlyStop := false
	select {
	case err := <-stopped:
		assert.NoError(t, err)
		t.Error("Stop returned while initial synchronization was still in progress")
		earlyStop = true
	case <-time.After(20 * time.Millisecond):
	}
	unblock()
	awaitLifecycleResult(t, synced)
	if earlyStop {
		// Clean up servers created after the broken shutdown returned.
		for _, server := range service.servers {
			require.NoError(t, server.Stop(context.Background()))
		}
		return
	}
	awaitLifecycleResult(t, stopped)
	assert.Empty(t, service.servers)
	assert.Equal(t, int64(2), state.writes.Load(), "both final snapshots must finish before Stop returns")
}

func TestServiceStopWaitsForRefresh(t *testing.T) {
	for _, newOrg := range []bool{false, true} {
		name := "config reload"
		if newOrg {
			name = "new organization"
		}
		t.Run(name, func(t *testing.T) {
			baseline := goleak.IgnoreCurrent()
			t.Cleanup(func() { goleak.VerifyNone(t, baseline) })
			ctx := context.Background()
			orgs := []*types.Organization{types.NewOrganization("first", "first")}
			service, state := newLifecycleService(t, &lifecycleOrgGetter{
				list: func(context.Context) ([]*types.Organization, error) { return orgs, nil },
			})
			require.NoError(t, service.SyncServers(ctx))
			require.Len(t, service.servers, 1)
			originalServer := service.servers[orgs[0].ID.StringValue()]
			oldHash := originalServer.Hash()
			if newOrg {
				orgs = append(orgs, types.NewOrganization("second", "second"))
			} else {
				service.config.Route.GroupWait += time.Second
			}

			entered := make(chan struct{})
			release := make(chan struct{})
			var once sync.Once
			unblock := func() { once.Do(func() { close(release) }) }
			t.Cleanup(func() {
				unblock()
				require.NoError(t, service.Stop(ctx))
			})
			var readOnce sync.Once
			service.configStore.(*lifecycleConfigStore).beforeGet = func() {
				readOnce.Do(func() {
					close(entered)
					<-release
				})
			}
			synced := make(chan error, 1)
			go func() { synced <- service.SyncServers(ctx) }()
			select {
			case <-entered:
			case <-time.After(5 * time.Second):
				t.Fatal("refresh did not reach config loading")
			}
			stopped := make(chan error, 1)
			go func() { stopped <- service.Stop(ctx) }()
			select {
			case err := <-stopped:
				t.Fatalf("Stop returned during refresh: %v", err)
			case <-time.After(20 * time.Millisecond):
			}
			unblock()
			awaitLifecycleResult(t, synced)
			awaitLifecycleResult(t, stopped)
			assert.Empty(t, service.servers)
			assert.Equal(t, int64(2*len(orgs)), state.writes.Load())
			if newOrg {
				assert.Equal(t, oldHash, originalServer.Hash())
			} else {
				expected, err := alertmanagertypes.NewDefaultConfig(service.config.Global, service.config.Route, orgs[0].ID.StringValue())
				require.NoError(t, err)
				assert.Equal(t, expected.StoreableConfig().Hash, originalServer.Hash())
				assert.NotEqual(t, oldHash, originalServer.Hash(), "the admitted refresh must apply its configuration before teardown")
			}
			require.NoError(t, service.SyncServers(ctx))
			assert.Empty(t, service.servers, "a queued refresh must not restart a stopped server")
		})
	}
}

func TestServiceStopWaitsForSnapshotsAndRejectsReaders(t *testing.T) {
	baseline := goleak.IgnoreCurrent()
	t.Cleanup(func() { goleak.VerifyNone(t, baseline) })
	ctx := context.Background()
	org := types.NewOrganization("test", "test")
	service, state := newLifecycleService(t, &lifecycleOrgGetter{
		list: func(context.Context) ([]*types.Organization, error) { return []*types.Organization{org}, nil },
	})
	require.NoError(t, service.SyncServers(ctx))
	require.Len(t, service.servers, 1)
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	t.Cleanup(func() {
		unblock()
		require.NoError(t, service.Stop(ctx))
	})
	state.beforeSet = func() {
		entered <- struct{}{}
		<-release
	}
	stopped := make(chan error, 1)
	go func() { stopped <- service.Stop(ctx) }()
	for range 2 {
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("shutdown did not reach both snapshots")
		}
	}
	repeated := make(chan error, 1)
	go func() { repeated <- service.Stop(ctx) }()
	read := make(chan error, 1)
	go func() { read <- service.PutAlerts(ctx, org.ID.StringValue(), nil) }()
	select {
	case err := <-stopped:
		t.Fatalf("Stop returned before snapshots finished: %v", err)
	case err := <-repeated:
		t.Fatalf("concurrent Stop returned before teardown finished: %v", err)
	case err := <-read:
		t.Fatalf("reader reached a server during teardown: %v", err)
	case <-time.After(20 * time.Millisecond):
	}
	unblock()
	awaitLifecycleResult(t, stopped)
	awaitLifecycleResult(t, repeated)
	select {
	case err := <-read:
		assert.True(t, errors.Asc(err, ErrCodeAlertmanagerNotFound))
	case <-time.After(5 * time.Second):
		t.Fatal("reader did not return after shutdown")
	}
	assert.Equal(t, int64(2), state.writes.Load())
	require.NoError(t, service.Stop(ctx))
}

func TestServiceFailedServerReconciliationDoesNotStartWorkers(t *testing.T) {
	for _, failure := range []string{"channel lookup", "config persistence"} {
		t.Run(failure, func(t *testing.T) {
			defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
			org := types.NewOrganization("test", "test")
			service, state := newLifecycleService(t, &lifecycleOrgGetter{
				list: func(context.Context) ([]*types.Organization, error) { return []*types.Organization{org}, nil },
			})
			store := service.configStore.(*lifecycleConfigStore)
			wantErr := errors.NewInternalf(errors.CodeInternal, "reconciliation failed")
			if failure == "channel lookup" {
				store.listChannelsErr = wantErr
			} else {
				store.stale = true
				store.setErr = wantErr
			}
			_, err := service.newServer(context.Background(), org.ID.StringValue())
			assert.ErrorIs(t, err, wantErr)
			assert.Empty(t, service.servers)
			require.NoError(t, service.Stop(context.Background()))
			assert.Zero(t, state.writes.Load())
		})
	}
}

func TestServiceStopAfterCanceledSync(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	entered := make(chan struct{})
	service, _ := newLifecycleService(t, &lifecycleOrgGetter{
		list: func(ctx context.Context) ([]*types.Organization, error) {
			close(entered)
			<-ctx.Done()
			return nil, ctx.Err()
		},
	})
	defer cancel()
	synced := make(chan error, 1)
	go func() { synced <- service.SyncServers(ctx) }()
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("synchronization did not begin")
	}
	cancel()
	select {
	case err := <-synced:
		assert.ErrorIs(t, err, context.Canceled)
	case <-time.After(5 * time.Second):
		t.Fatal("canceled synchronization did not return")
	}
	require.NoError(t, service.Stop(context.Background()))
	require.NoError(t, service.SyncServers(context.Background()))
}
