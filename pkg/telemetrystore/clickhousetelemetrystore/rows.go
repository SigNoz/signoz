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
	if err := r.Rows.Err(); err != nil {
		r.event.Err = err
	}
	closeErr := r.Rows.Close()
	if closeErr != nil {
		r.event.Err = closeErr
	}
	r.onClose()
	return closeErr
}
