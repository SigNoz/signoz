package telemetrystore

import "github.com/ClickHouse/clickhouse-go/v2"

type TelemetryStore interface {
	// Clickhouse returns the Clickhouse connection.
	Clickhouse() clickhouse.Conn
}
