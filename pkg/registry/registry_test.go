package registry

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/factory/servicetest"
)

func TestRegistryWith2HttpServers(t *testing.T) {
	http1, err := servicetest.NewHttpService("http1")
	require.NoError(t, err)

	http2, err := servicetest.NewHttpService("http2")
	require.NoError(t, err)

	registry, err := New(slog.New(slog.NewTextHandler(io.Discard, nil)), http1, http2)
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

func TestRegistryWith2HttpServersWithoutWait(t *testing.T) {
	http1, err := servicetest.NewHttpService("http1")
	require.NoError(t, err)

	http2, err := servicetest.NewHttpService("http2")
	require.NoError(t, err)

	registry, err := New(slog.New(slog.NewTextHandler(io.Discard, nil)), http1, http2)
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
