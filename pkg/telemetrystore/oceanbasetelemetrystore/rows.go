package oceanbasetelemetrystore

import (
	"database/sql"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

type rows struct {
	*sql.Rows
	names    []string
	columns  []telemetrystore.ColumnType
	started  time.Time
	finished time.Time
	onClose  func(error)
	once     sync.Once
	scanErr  error
	maxRows  int
	seenRows int
}

type columnType struct{ scanType reflect.Type }

func (c columnType) ScanType() reflect.Type { return c.scanType }

func newRows(sqlRows *sql.Rows, started time.Time, onClose func(error)) (*rows, error) {
	names, err := sqlRows.Columns()
	if err != nil {
		return nil, err
	}
	columns, err := sqlRows.ColumnTypes()
	if err != nil {
		return nil, err
	}
	types := make([]telemetrystore.ColumnType, len(columns))
	for i, col := range columns {
		var typ reflect.Type
		switch strings.ToUpper(col.DatabaseTypeName()) {
		case "JSON":
			typ = reflect.TypeFor[telemetrystoretypes.JSONValue]()
		case "TINYINT", "SMALLINT", "MEDIUMINT", "INT", "BIGINT":
			typ = reflect.TypeFor[int64]()
		case "UNSIGNED TINYINT", "UNSIGNED SMALLINT", "UNSIGNED MEDIUMINT", "UNSIGNED INT", "UNSIGNED BIGINT":
			typ = reflect.TypeFor[uint64]()
		case "FLOAT", "DOUBLE", "DECIMAL", "NEWDECIMAL":
			typ = reflect.TypeFor[float64]()
		case "TIMESTAMP", "DATETIME", "DATE":
			typ = reflect.TypeFor[time.Time]()
		default:
			typ = reflect.TypeFor[string]()
		}
		// sql.Null* structs aren't result values understood by the querier. SQL
		// scanning into **T preserves NULL while exposing the underlying type.
		if nullable, ok := col.Nullable(); ok && nullable {
			typ = reflect.PointerTo(typ)
		}
		types[i] = columnType{typ}
	}
	return &rows{Rows: sqlRows, names: names, columns: types, started: started, onClose: onClose}, nil
}

func (r *rows) Columns() []string                        { return r.names }
func (r *rows) ColumnTypes() []telemetrystore.ColumnType { return r.columns }
func (r *rows) Scan(dest ...any) error {
	err := r.Rows.Scan(dest...)
	if err != nil {
		r.scanErr = err
	}
	return err
}
func (r *rows) Next() bool {
	if r.scanErr != nil {
		return false
	}
	next := r.Rows.Next()
	if next {
		r.seenRows++
		if r.maxRows > 0 && r.seenRows > r.maxRows {
			r.scanErr = errors.NewInvalidInputf(errors.CodeInvalidInput, "query exceeds the %d row result limit; increase the step or narrow the filters", r.maxRows)
			next = false
		}
	}
	if !next && r.finished.IsZero() {
		r.finished = time.Now()
	}
	return next
}
func (r *rows) Err() error {
	if r.scanErr != nil {
		return r.scanErr
	}
	return r.Rows.Err()
}
func (r *rows) Close() error {
	err := r.Rows.Close()
	r.once.Do(func() {
		if r.finished.IsZero() {
			r.finished = time.Now()
		}
		queryErr := r.scanErr
		if queryErr == nil {
			queryErr = r.Rows.Err()
		}
		if queryErr == nil {
			queryErr = err
		}
		r.onClose(queryErr)
	})
	return err
}
func (r *rows) QueryStats() telemetrystore.QueryStats {
	end := r.finished
	if end.IsZero() {
		end = time.Now()
	}
	return telemetrystore.QueryStats{Elapsed: end.Sub(r.started)}
}
