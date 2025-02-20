package factory

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"

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

func TestRegistryWith2Services(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	registry, err := NewRegistry(slog.New(slog.NewTextHandler(io.Discard, nil)), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		require.NoError(t, registry.Start(ctx))
		require.NoError(t, registry.Wait(ctx))
		require.NoError(t, registry.Stop(ctx))
	}()
	cancel()

	wg.Wait()
}

func TestRegistryWith2ServicesWithoutWait(t *testing.T) {
	s1 := newTestService(t)
	s2 := newTestService(t)

	registry, err := NewRegistry(slog.New(slog.NewTextHandler(io.Discard, nil)), NewNamedService(MustNewName("s1"), s1), NewNamedService(MustNewName("s2"), s2))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		require.NoError(t, registry.Start(ctx))
		require.NoError(t, registry.Stop(ctx))
	}()

	wg.Wait()
}
