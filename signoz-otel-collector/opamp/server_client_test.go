package opamp

import (
	"context"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/SigNoz/signoz-otel-collector/signozcol"
	"github.com/gorilla/websocket"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func eventually(t *testing.T, f func() bool) {
	assert.Eventually(t, f, 5*time.Second, 10*time.Millisecond)
}

func TestNewClient(t *testing.T) {
	// FIXME(srikanthccv): this test interferes with other tests that use the same port.
	// Remove the sleep and find a better way to fix this.
	time.Sleep(5 * time.Second)
	srv := StartMockServer(t)

	var conn atomic.Value
	srv.OnWSConnect = func(c *websocket.Conn) {
		conn.Store(c)
	}
	var connected int64

	srv.OnMessage = func(msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
		fileContents, err := os.ReadFile("testdata/coll-config-path-changed.yaml")
		assert.NoError(t, err)
		atomic.AddInt64(&connected, 1)
		var resp *protobufs.ServerToAgent = &protobufs.ServerToAgent{}
		if atomic.LoadInt64(&connected) == 1 {
			resp = &protobufs.ServerToAgent{
				RemoteConfig: &protobufs.AgentRemoteConfig{
					Config: &protobufs.AgentConfigMap{
						ConfigMap: map[string]*protobufs.AgentConfigFile{
							"collector.yaml": {
								Body:        fileContents,
								ContentType: "text/yaml",
							},
						},
					},
				},
			}
		}
		return resp
	}

	logger := zap.NewNop()
	cnt := 0
	reloadFunc := func(contents []byte) error {
		cnt++
		return nil
	}

	_, err := NewDynamicConfig("./testdata/coll-config-path.yaml", reloadFunc, logger)
	require.NoError(t, err)

	// maintain a cop of the original config file and restore it after the test
	fileContents, err := os.ReadFile("testdata/coll-config-path.yaml")
	require.NoError(t, err)
	defer func() {
		err := os.WriteFile("testdata/coll-config-path.yaml", fileContents, 0644)
		require.NoError(t, err)
	}()

	coll := signozcol.New(signozcol.WrappedCollectorSettings{
		ConfigPaths: []string{"./testdata/coll-config-path.yaml"},
		Version:     "0.0.1-server-client-test",
	})

	svrClient, err := NewServerClient(&NewServerClientOpts{
		Logger: logger,
		Config: &AgentManagerConfig{
			ServerEndpoint: "ws://" + srv.Endpoint,
		},
		CollectorConfgPath: "./testdata/coll-config-path.yaml",
		WrappedCollector:   coll,
	})

	require.NoError(t, err)

	ctx := context.Background()
	// Start the client.
	err = svrClient.Start(ctx)
	defer func() {
		err := svrClient.Stop(ctx)
		require.NoError(t, err)
	}()
	require.NoError(t, err)

	// Wait for the client to connect.
	eventually(t, func() bool {
		return atomic.LoadInt64(&connected) == 1
	})
}
