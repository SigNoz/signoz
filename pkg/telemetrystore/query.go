package telemetrystore

import (
	"reflect"
	"time"
)

// Rows is the storage-independent result consumed by the querier. In particular,
// SQL drivers need not implement ClickHouse's batches, totals or struct scanning.
type Rows interface {
	Columns() []string
	ColumnTypes() []ColumnType
	Next() bool
	Scan(...any) error
	Err() error
	Close() error
	QueryStats() QueryStats
}

type ColumnType interface {
	ScanType() reflect.Type
}

// QueryStats describes server work when the engine reports it. Unavailable scan
// counters stay zero; returned rows must not be mislabeled as scanned rows.
type QueryStats struct {
	RowsScanned  uint64
	BytesScanned uint64
	Elapsed      time.Duration
}
