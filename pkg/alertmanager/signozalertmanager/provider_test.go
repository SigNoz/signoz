package signozalertmanager

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/goleak"
)

type lifecycleGetter struct {
	organization.Getter
	list func(context.Context) ([]*types.Organization, error)
}

func (g *lifecycleGetter) ListByOwnedKeyRange(ctx context.Context) ([]*types.Organization, error) {
	return g.list(ctx)
}

func newLifecycleProvider(t *testing.T, getter organization.Getter) *provider {
	t.Helper()
	store := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)
	t.Cleanup(func() {
		store.Mock().ExpectClose()
		require.NoError(t, store.BunDB().Close())
		require.NoError(t, store.Mock().ExpectationsWereMet())
	})
	config := alertmanager.Config{Signoz: alertmanager.Signoz{
		PollInterval: time.Millisecond,
		Config:       alertmanagerserver.NewConfig(),
	}}
	p, err := New(factorytest.NewSettings(), config, store, getter, nil, nil)
	require.NoError(t, err)
	return p
}

func TestProviderStopBeforeStart(t *testing.T) {
	var calls atomic.Int64
	p := newLifecycleProvider(t, &lifecycleGetter{
		list: func(context.Context) ([]*types.Organization, error) {
			calls.Add(1)
			return []*types.Organization{}, nil
		},
	})
	require.NoError(t, p.Stop(context.Background()))
	done := make(chan error, 1)
	go func() { done <- p.Start(context.Background()) }()
	select {
	case err := <-done:
		require.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("late Start did not return")
	}
	assert.Zero(t, calls.Load())

	var wg sync.WaitGroup
	for range 10 {
		wg.Go(func() { assert.NoError(t, p.Stop(context.Background())) })
	}
	wg.Wait()
}

func TestProviderStopAfterStartupFailure(t *testing.T) {
	wantErr := errors.NewInternalf(errors.CodeInternal, "organization lookup failed")
	p := newLifecycleProvider(t, &lifecycleGetter{
		list: func(context.Context) ([]*types.Organization, error) { return nil, wantErr },
	})
	assert.ErrorIs(t, p.Start(context.Background()), wantErr)
	require.NoError(t, p.Stop(context.Background()))
	require.NoError(t, p.Start(context.Background()))
	require.NoError(t, p.Stop(context.Background()))
}

func TestRegistryStopsProviderDuringSync(t *testing.T) {
	entered := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	p := newLifecycleProvider(t, &lifecycleGetter{
		list: func(context.Context) ([]*types.Organization, error) {
			close(entered)
			<-release
			return []*types.Organization{}, nil
		},
	})
	// The SQL mock has its own lifetime; only check goroutines created after it.
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
	defer func() {
		unblock()
		require.NoError(t, p.Stop(context.Background()))
	}()
	settings := factorytest.NewSettings()
	registry, err := factory.NewRegistry(context.Background(), settings.Logger,
		factory.NewNamedService(factory.MustNewName("alertmanager"), p))
	require.NoError(t, err)
	registry.Start(context.Background())
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("registry did not start provider synchronization")
	}
	stopped := make(chan error, 1)
	go func() { stopped <- registry.Stop(context.Background()) }()
	select {
	case err := <-stopped:
		t.Fatalf("registry shutdown returned before synchronization: %v", err)
	case <-time.After(20 * time.Millisecond):
	}
	unblock()
	select {
	case err := <-stopped:
		require.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("registry shutdown did not finish")
	}
}
