package telemetrystore

import "github.com/ClickHouse/clickhouse-go/v2"

type TelemetryStore interface {
	// Returns the SigNoz Wrapper for Clickhouse
	ClickHouse() clickhouse.Conn

	// Clickhouse returns the Clickhouse connection.
	ClickHouseConn() clickhouse.Conn
}
