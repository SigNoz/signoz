package registry

import (
	"context"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRegistryWith2HttpServers(t *testing.T) {
	http1, err := newHttpService("http1")
	require.NoError(t, err)

	http2, err := newHttpService("http2")
	require.NoError(t, err)

	registry, err := New(zap.NewNop(), http1, http2)
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
	http1, err := newHttpService("http1")
	require.NoError(t, err)

	http2, err := newHttpService("http2")
	require.NoError(t, err)

	registry, err := New(zap.NewNop(), http1, http2)
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
