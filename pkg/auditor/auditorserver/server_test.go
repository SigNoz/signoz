package auditorserver

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestSettings() factory.ScopedProviderSettings {
	return factory.NewScopedProviderSettings(instrumentationtest.New().ToProviderSettings(), "auditorserver_test")
}

func newTestEvent(resource string, action audittypes.Action) audittypes.AuditEvent {
	return audittypes.AuditEvent{
		Timestamp: time.Now(),
		EventName: audittypes.NewEventName(resource, action),
		AuditAttributes: audittypes.AuditAttributes{
			Action:  action,
			Outcome: audittypes.OutcomeSuccess,
		},
		ResourceAttributes: audittypes.ResourceAttributes{
			ResourceKind: resource,
		},
	}
}

func TestNew(t *testing.T) {
	settings := newTestSettings()
	config := Config{BufferSize: 10, BatchSize: 5, FlushInterval: time.Second}

	server, err := New(settings, config, func(_ context.Context, _ []audittypes.AuditEvent) error { return nil })
	require.NoError(t, err)
	assert.NotNil(t, server)
}

func TestStart_Stop(t *testing.T) {
	settings := newTestSettings()
	config := Config{BufferSize: 10, BatchSize: 5, FlushInterval: time.Second}

	server, err := New(settings, config, func(_ context.Context, _ []audittypes.AuditEvent) error { return nil })
	require.NoError(t, err)

	done := make(chan error, 1)
	go func() { done <- server.Start(context.Background()) }()

	require.NoError(t, server.Stop(context.Background()))

	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(2 * time.Second):
		assert.Fail(t, "Start did not return after Stop")
	}
}

func TestAdd_FlushesOnBatchSize(t *testing.T) {
	var exported []audittypes.AuditEvent
	var mu sync.Mutex

	settings := newTestSettings()
	config := Config{BufferSize: 100, BatchSize: 3, FlushInterval: time.Hour}

	server, err := New(settings, config, func(_ context.Context, events []audittypes.AuditEvent) error {
		mu.Lock()
		exported = append(exported, events...)
		mu.Unlock()
		return nil
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = server.Start(ctx) }()

	for i := 0; i < 3; i++ {
		server.Add(ctx, newTestEvent("dashboard", audittypes.ActionCreate))
	}

	assert.Eventually(t, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return len(exported) == 3
	}, 2*time.Second, 10*time.Millisecond)

	require.NoError(t, server.Stop(ctx))
}

func TestAdd_FlushesOnInterval(t *testing.T) {
	var exported atomic.Int64

	settings := newTestSettings()
	config := Config{BufferSize: 100, BatchSize: 1000, FlushInterval: 50 * time.Millisecond}

	server, err := New(settings, config, func(_ context.Context, events []audittypes.AuditEvent) error {
		exported.Add(int64(len(events)))
		return nil
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = server.Start(ctx) }()

	server.Add(ctx, newTestEvent("user", audittypes.ActionUpdate))

	assert.Eventually(t, func() bool {
		return exported.Load() == 1
	}, 2*time.Second, 10*time.Millisecond)

	require.NoError(t, server.Stop(ctx))
}

func TestAdd_DropsWhenBufferFull(t *testing.T) {
	settings := newTestSettings()
	config := Config{BufferSize: 2, BatchSize: 100, FlushInterval: time.Hour}

	server, err := New(settings, config, func(_ context.Context, _ []audittypes.AuditEvent) error { return nil })
	require.NoError(t, err)

	ctx := context.Background()

	server.Add(ctx, newTestEvent("dashboard", audittypes.ActionCreate))
	server.Add(ctx, newTestEvent("dashboard", audittypes.ActionUpdate))
	server.Add(ctx, newTestEvent("dashboard", audittypes.ActionDelete))

	assert.Equal(t, 2, server.queueLen())
}

func TestStop_DrainsRemainingEvents(t *testing.T) {
	var exported atomic.Int64

	settings := newTestSettings()
	config := Config{BufferSize: 100, BatchSize: 100, FlushInterval: time.Hour}

	server, err := New(settings, config, func(_ context.Context, events []audittypes.AuditEvent) error {
		exported.Add(int64(len(events)))
		return nil
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = server.Start(ctx) }()

	for i := 0; i < 5; i++ {
		server.Add(ctx, newTestEvent("alert-rule", audittypes.ActionCreate))
	}

	require.NoError(t, server.Stop(ctx))

	assert.Equal(t, int64(5), exported.Load())
}

func TestAdd_ContinuesAfterExportFailure(t *testing.T) {
	var calls atomic.Int64

	settings := newTestSettings()
	config := Config{BufferSize: 100, BatchSize: 2, FlushInterval: time.Hour}

	server, err := New(settings, config, func(_ context.Context, _ []audittypes.AuditEvent) error {
		calls.Add(1)
		return errors.New(errors.TypeInternal, errors.CodeInternal, "connection refused")
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = server.Start(ctx) }()

	server.Add(ctx, newTestEvent("user", audittypes.ActionDelete))
	server.Add(ctx, newTestEvent("user", audittypes.ActionDelete))

	assert.Eventually(t, func() bool {
		return calls.Load() >= 1
	}, 2*time.Second, 10*time.Millisecond)

	require.NoError(t, server.Stop(ctx))
}

func TestAdd_ConcurrentSafety(t *testing.T) {
	var exported atomic.Int64

	settings := newTestSettings()
	config := Config{BufferSize: 1000, BatchSize: 10, FlushInterval: 50 * time.Millisecond}

	server, err := New(settings, config, func(_ context.Context, events []audittypes.AuditEvent) error {
		exported.Add(int64(len(events)))
		return nil
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { _ = server.Start(ctx) }()

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			server.Add(ctx, newTestEvent("dashboard", audittypes.ActionCreate))
		}()
	}
	wg.Wait()

	require.NoError(t, server.Stop(ctx))

	assert.Equal(t, int64(100), exported.Load())
}
