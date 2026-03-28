package factory

import (
	"context"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type tservice struct {
	c chan struct{}
}

func newTestService(t *testing.T) *tservice {
	t.Helper()
	return &tservice{c: make(chan struct{})}
}

func (s *tservice) Start(_ context.Context) error {
	<-s.c
	return nil
}

func (s *tservice) Stop(_ context.Context) error {
	close(s.c)
	return nil
}

type healthyTestService struct {
	tservice
	healthyC chan struct{}
}

func newHealthyTestService(t *testing.T) *healthyTestService {
	t.Helper()
	return &healthyTestService{
		tservice: tservice{c: make(chan struct{})},
		healthyC: make(chan struct{}),
	}
}

func (s *healthyTestService) Healthy() <-chan struct{} {
	return s.healthyC
}

// failingHealthyService implements Healthy but fails before signaling healthy.
type failingHealthyService struct {
	healthyC chan struct{}
	err      error
}

func (s *failingHealthyService) Start(_ context.Context) error {
	return s.err
}

func (s *failingHealthyService) Stop(_ context.Context) error {
	return nil
}

func (s *failingHealthyService) Healthy() <-chan struct{} {
	return s.healthyC
}

func TestRegistryWith2Services(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		registry.Start(ctx)
		assert.NoError(t, registry.Wait(ctx))
		assert.NoError(t, registry.Stop(ctx))
	}()
	cancel()

	wg.Wait()
}

func TestRegistryWith2ServicesWithoutWait(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		registry.Start(ctx)
		assert.NoError(t, registry.Stop(ctx))
	}()

	wg.Wait()
}

func TestServiceStateTransitions(t *testing.T) {
	s1 := newTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	require.NoError(t, registry.AwaitHealthy(ctx))

	byState := registry.ServicesByState()
	assert.Len(t, byState[StateRunning], 1)
	assert.True(t, registry.IsHealthy())

	assert.NoError(t, registry.Stop(ctx))
}

func TestServiceStateWithHealthy(t *testing.T) {
	s1 := newHealthyTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	// Poll until STARTING state is observed
	require.Eventually(t, func() bool {
		byState := registry.ServicesByState()
		return len(byState[StateStarting]) == 1
	}, time.Second, time.Millisecond)
	assert.False(t, registry.IsHealthy())

	// Signal healthy
	close(s1.healthyC)

	require.NoError(t, registry.AwaitHealthy(ctx))
	assert.True(t, registry.IsHealthy())

	byState := registry.ServicesByState()
	assert.Len(t, byState[StateRunning], 1)

	assert.NoError(t, registry.Stop(ctx))
}

func TestAwaitHealthy(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	assert.NoError(t, registry.AwaitHealthy(ctx))
	assert.True(t, registry.IsHealthy())

	assert.NoError(t, registry.Stop(ctx))
}

func TestAwaitHealthyWithFailure(t *testing.T) {
	s1 := &failingHealthyService{
		healthyC: make(chan struct{}),
		err:      errors.Newf(errors.TypeInternal, errors.CodeInternal,"startup failed"),
	}

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	err = registry.AwaitHealthy(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "startup failed")
}

func TestServicesByState(t *testing.T) {
	s1 := newTestService(t)
	s2 := newHealthyTestService(t)

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	// Wait for s1 to be running (no Healthy interface) and s2 to be starting
	require.Eventually(t, func() bool {
		byState := registry.ServicesByState()
		return len(byState[StateRunning]) == 1 && len(byState[StateStarting]) == 1
	}, time.Second, time.Millisecond)

	// Make s2 healthy
	close(s2.healthyC)

	require.NoError(t, registry.AwaitHealthy(ctx))
	byState := registry.ServicesByState()
	assert.Len(t, byState[StateRunning], 2)

	assert.NoError(t, registry.Stop(ctx))
}

func TestDependsOnStartsAfterDependency(t *testing.T) {
	s1 := newHealthyTestService(t)
	s2 := newTestService(t)

	// s2 depends on s1
	registry, err := NewRegistry(
		context.Background(),
		slog.New(slog.DiscardHandler),
		NewNamedService(MustNewName("s1"), s1),
		NewNamedService(MustNewName("s2"), s2, MustNewName("s1")),
	)
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	// s2 should still be STARTING because s1 hasn't become healthy yet
	require.Eventually(t, func() bool {
		byState := registry.ServicesByState()
		return len(byState[StateStarting]) == 2
	}, time.Second, time.Millisecond)

	// Make s1 healthy — s2 should then start and become RUNNING
	close(s1.healthyC)

	assert.NoError(t, registry.AwaitHealthy(ctx))
	assert.True(t, registry.IsHealthy())

	assert.NoError(t, registry.Stop(ctx))
}

func TestDependsOnFailsWhenDependencyFails(t *testing.T) {
	s1 := &failingHealthyService{
		healthyC: make(chan struct{}),
		err:      errors.Newf(errors.TypeInternal, errors.CodeInternal,"s1 crashed"),
	}
	s2 := newTestService(t)

	// s2 depends on s1
	registry, err := NewRegistry(
		context.Background(),
		slog.New(slog.DiscardHandler),
		NewNamedService(MustNewName("s1"), s1),
		NewNamedService(MustNewName("s2"), s2, MustNewName("s1")),
	)
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	// Both should eventually fail
	assert.Eventually(t, func() bool {
		byState := registry.ServicesByState()
		return len(byState[StateFailed]) == 2
	}, time.Second, time.Millisecond)
}

func TestDependsOnUnknownServiceIsIgnored(t *testing.T) {
	s1 := newTestService(t)

	// Unknown dependency is logged and ignored, not an error.
	registry, err := NewRegistry(
		context.Background(),
		slog.New(slog.DiscardHandler),
		NewNamedService(MustNewName("s1"), s1, MustNewName("unknown")),
	)
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	assert.NoError(t, registry.AwaitHealthy(ctx))
	assert.True(t, registry.IsHealthy())

	assert.NoError(t, registry.Stop(ctx))
}

func TestServiceStateFailed(t *testing.T) {
	s1 := &failingHealthyService{
		healthyC: make(chan struct{}),
		err:      errors.Newf(errors.TypeInternal, errors.CodeInternal,"fatal error"),
	}

	registry, err := NewRegistry(context.Background(), slog.New(slog.DiscardHandler), NewNamedService(MustNewName("s1"), s1))
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	// Wait for the service to fail
	assert.Eventually(t, func() bool {
		byState := registry.ServicesByState()
		return len(byState[StateFailed]) == 1
	}, time.Second, time.Millisecond)
	assert.False(t, registry.IsHealthy())
}

func TestDependsOnSelfDependencyIsIgnored(t *testing.T) {
	s1 := newTestService(t)

	// Self-dependency is logged and ignored.
	registry, err := NewRegistry(
		context.Background(),
		slog.New(slog.DiscardHandler),
		NewNamedService(MustNewName("s1"), s1, MustNewName("s1")),
	)
	require.NoError(t, err)

	ctx := context.Background()
	registry.Start(ctx)

	assert.NoError(t, registry.AwaitHealthy(ctx))
	assert.True(t, registry.IsHealthy())

	assert.NoError(t, registry.Stop(ctx))
}

func TestDependsOnCycleReturnsError(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	// A -> B and B -> A is a cycle.
	_, err := NewRegistry(
		context.Background(),
		slog.New(slog.DiscardHandler),
		NewNamedService(MustNewName("s1"), s1, MustNewName("s2")),
		NewNamedService(MustNewName("s2"), s2, MustNewName("s1")),
	)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "dependency cycles detected")
}
