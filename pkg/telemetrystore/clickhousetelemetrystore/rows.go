package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

// rowsWithHooks wraps driver.Rows and defers AfterQuery hooks until Close(),
// so the instrumentation span covers the full query lifecycle including row consumption.
type rowsWithHooks struct {
	driver.Rows
	ctx     context.Context
	event   *telemetrystore.QueryEvent
	onClose func()
	closed  bool
}

func (r *rowsWithHooks) Close() error {
	// delegate to the original rows.Close() if already closed
	if r.closed {
		return r.Rows.Close()
	}

	// mark as closed and run the onClose hook
	r.closed = true
	if err := castError(r.Rows.Err()); err != nil {
		r.event.Err = err
	}
	closeErr := castError(r.Rows.Close())
	if closeErr != nil {
		r.event.Err = closeErr
	}
	r.onClose()
	return closeErr
}

func (r *rowsWithHooks) Err() error {
	return castError(r.Rows.Err())
}

func (r *rowsWithHooks) Scan(dest ...any) error {
	return castError(r.Rows.Scan(dest...))
}

func (r *rowsWithHooks) ScanStruct(dest any) error {
	return castError(r.Rows.ScanStruct(dest))
}

func (r *rowsWithHooks) Totals(dest ...any) error {
	return castError(r.Rows.Totals(dest...))
}

// rowWithCastError wraps driver.Row so errors surfaced by Err/Scan/ScanStruct
// are normalized through castError, matching the rest of the provider's API.
type rowWithCastError struct {
	driver.Row
}

func (r *rowWithCastError) Err() error {
	return castError(r.Row.Err())
}

func (r *rowWithCastError) Scan(dest ...any) error {
	return castError(r.Row.Scan(dest...))
}

func (r *rowWithCastError) ScanStruct(dest any) error {
	return castError(r.Row.ScanStruct(dest))
}

// batchWithCastError wraps driver.Batch so error-returning methods (Append,
// Send, Close, etc.) are normalized through castError.
type batchWithCastError struct {
	driver.Batch
}

func (b *batchWithCastError) Abort() error {
	return castError(b.Batch.Abort())
}

func (b *batchWithCastError) Append(v ...any) error {
	return castError(b.Batch.Append(v...))
}

func (b *batchWithCastError) AppendStruct(v any) error {
	return castError(b.Batch.AppendStruct(v))
}

func (b *batchWithCastError) Flush() error {
	return castError(b.Batch.Flush())
}

func (b *batchWithCastError) Send() error {
	return castError(b.Batch.Send())
}

func (b *batchWithCastError) Close() error {
	return castError(b.Batch.Close())
}

func (b *batchWithCastError) Column(i int) driver.BatchColumn {
	return &batchColumnWithCastError{BatchColumn: b.Batch.Column(i)}
}

// batchColumnWithCastError wraps driver.BatchColumn so column-level appends
// also flow through castError.
type batchColumnWithCastError struct {
	driver.BatchColumn
}

func (c *batchColumnWithCastError) Append(v any) error {
	return castError(c.BatchColumn.Append(v))
}

func (c *batchColumnWithCastError) AppendRow(v any) error {
	return castError(c.BatchColumn.AppendRow(v))
}
