package querier

import (
	"context"
	"math"
	"reflect"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeClickHouseQueryResultTooLarge = errors.MustNewCode("result_too_large")
	ErrCodeClickHouseQueryTimeout        = errors.MustNewCode("query_timeout")
)

var timeType = reflect.TypeFor[time.Time]()

// settings returns the ClickHouse side of the budget. A SETTINGS clause in the user's SQL overrides
// these, so the time and result limits are also enforced while reading rows.
func (c ClickHouseQueryConfig) settings() clickhouse.Settings {
	settings := clickhouse.Settings{}
	if c.MaxExecutionTime > 0 {
		settings["max_execution_time"] = int(math.Ceil(c.MaxExecutionTime.Seconds()))
	}
	if c.MaxMemoryUsage > 0 {
		settings["max_memory_usage"] = c.MaxMemoryUsage
	}
	if c.MaxResultRows > 0 {
		settings["max_result_rows"] = c.MaxResultRows
		settings["result_overflow_mode"] = "throw"
	}
	if c.MaxResultBytes > 0 {
		settings["max_result_bytes"] = c.MaxResultBytes
		settings["result_overflow_mode"] = "throw"
	}
	return settings
}

func (q *chSQLQuery) budgetError(parentCtx, ctx context.Context, err error) error {
	if parentCtx.Err() == nil && errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return errors.WrapTimeoutf(err, ErrCodeClickHouseQueryTimeout, "query ran longer than the %s limit", q.budget.MaxExecutionTime).
			WithSuggestions("add a LIMIT, narrow the time range or filter on indexed columns")
	}
	return err
}

// resultBudgetRows fails Scan, and cancels the query, once the scanned rows exceed maxRows or maxBytes.
// Cancelling first matters: Close otherwise drains the rest of the result.
type resultBudgetRows struct {
	driver.Rows
	cancel   context.CancelFunc
	maxRows  uint64
	maxBytes uint64
	rows     uint64
	bytes    uint64
}

func newResultBudgetRows(rows driver.Rows, cancel context.CancelFunc, maxRows, maxBytes int64) driver.Rows {
	if maxRows <= 0 && maxBytes <= 0 {
		return rows
	}
	budgeted := &resultBudgetRows{Rows: rows, cancel: cancel}
	if maxRows > 0 {
		budgeted.maxRows = uint64(maxRows)
	}
	if maxBytes > 0 {
		budgeted.maxBytes = uint64(maxBytes)
	}
	return budgeted
}

func (r *resultBudgetRows) Scan(dest ...any) error {
	if err := r.Rows.Scan(dest...); err != nil {
		return err
	}

	r.rows++
	if r.maxRows > 0 && r.rows > r.maxRows {
		r.cancel()
		return errors.NewInvalidInputf(ErrCodeClickHouseQueryResultTooLarge, "query result has more than the %d rows limit", r.maxRows).
			WithSuggestions("add a LIMIT, narrow the time range or aggregate the rows")
	}

	if r.maxBytes == 0 {
		return nil
	}
	for _, d := range dest {
		r.bytes += valueSize(reflect.ValueOf(d))
	}
	if r.bytes > r.maxBytes {
		r.cancel()
		return errors.NewInvalidInputf(ErrCodeClickHouseQueryResultTooLarge, "query result is larger than the %d bytes limit", r.maxBytes).
			WithSuggestions("add a LIMIT, narrow the time range or select fewer columns")
	}
	return nil
}

// valueSize approximates the in-memory payload of a scanned value: string and byte lengths plus
// fixed-size scalars. It ignores Go headers, so it is a lower bound.
func valueSize(v reflect.Value) uint64 {
	switch v.Kind() {
	case reflect.Invalid:
		return 0
	case reflect.Pointer, reflect.Interface:
		if v.IsNil() {
			return 0
		}
		return valueSize(v.Elem())
	case reflect.String:
		return uint64(v.Len())
	case reflect.Slice, reflect.Array:
		if v.Type().Elem().Kind() == reflect.Uint8 {
			return uint64(v.Len())
		}
		var size uint64
		for i := range v.Len() {
			size += valueSize(v.Index(i))
		}
		return size
	case reflect.Map:
		var size uint64
		iter := v.MapRange()
		for iter.Next() {
			size += valueSize(iter.Key()) + valueSize(iter.Value())
		}
		return size
	case reflect.Struct:
		if v.Type() == timeType {
			return uint64(timeType.Size())
		}
		var size uint64
		for i := range v.NumField() {
			size += valueSize(v.Field(i))
		}
		return size
	default:
		return uint64(v.Type().Size())
	}
}
