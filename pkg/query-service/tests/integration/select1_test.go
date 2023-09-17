package tests

import (
	"context"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/docker/go-connections/nat"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	nativeProtocolPort = "9000"
	httpPort           = "8443"
)

func createClickHouseContainer(t *testing.T, externalNativeProtocolPort, externalHTTPPort string) testcontainers.Container {

	req := testcontainers.ContainerRequest{
		Image: "clickhouse/clickhouse-server:23.3.8.21-alpine",
		ExposedPorts: []string{
			externalNativeProtocolPort + ":" + nativeProtocolPort,
			externalHTTPPort + ":" + httpPort,
		},
		WaitingFor: wait.ForListeningPort(nat.Port(nativeProtocolPort)).
			WithStartupTimeout(2 * time.Minute),
	}

	container, err := testcontainers.GenericContainer(
		context.Background(),
		testcontainers.GenericContainerRequest{
			ContainerRequest: req,
			Started:          true,
		},
	)
	require.NoError(t, err)

	return container
}

func TestSelect1(t *testing.T) {
	dbContainer := createClickHouseContainer(t, nativeProtocolPort, httpPort)
	defer func() {
		require.NoError(t, dbContainer.Terminate(context.Background()))
	}()

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{"127.0.0.1:9000"},
	})
	require.NoError(t, err)

	var number uint8
	row := conn.QueryRow(context.TODO(), "SELECT 1;")
	err = row.Scan(&number)
	require.NoError(t, err)
	require.Equal(t, uint8(1), number)
}
