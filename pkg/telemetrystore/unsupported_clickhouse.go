package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/errors"
)

// UnsupportedClickHouse is a fail-closed adapter for legacy ClickHouse-only
// modules. It never opens a connection or silently runs CH SQL on another engine.
type UnsupportedClickHouse struct{}

var _ driver.Conn = UnsupportedClickHouse{}

func Unsupported(feature string) error {
	return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "%s is not supported by the OceanBase telemetry profile", feature)
}

func (UnsupportedClickHouse) Contributors() []string { return nil }
func (UnsupportedClickHouse) ServerVersion() (*driver.ServerVersion, error) {
	return nil, Unsupported("ClickHouse server metadata")
}
func (UnsupportedClickHouse) Select(context.Context, any, string, ...any) error {
	return Unsupported("ClickHouse query")
}
func (UnsupportedClickHouse) Query(context.Context, string, ...any) (driver.Rows, error) {
	return nil, Unsupported("ClickHouse query")
}
func (UnsupportedClickHouse) QueryRow(context.Context, string, ...any) driver.Row {
	return unsupportedRow{}
}
func (UnsupportedClickHouse) PrepareBatch(context.Context, string, ...driver.PrepareBatchOption) (driver.Batch, error) {
	return nil, Unsupported("ClickHouse batch")
}
func (UnsupportedClickHouse) Exec(context.Context, string, ...any) error {
	return Unsupported("ClickHouse statement")
}
func (UnsupportedClickHouse) AsyncInsert(context.Context, string, bool, ...any) error {
	return Unsupported("ClickHouse insert")
}
func (UnsupportedClickHouse) Ping(context.Context) error { return Unsupported("ClickHouse connection") }
func (UnsupportedClickHouse) Stats() driver.Stats        { return driver.Stats{} }
func (UnsupportedClickHouse) Close() error               { return nil }

type unsupportedRow struct{}

func (unsupportedRow) Err() error             { return Unsupported("ClickHouse query") }
func (r unsupportedRow) Scan(...any) error    { return r.Err() }
func (r unsupportedRow) ScanStruct(any) error { return r.Err() }
