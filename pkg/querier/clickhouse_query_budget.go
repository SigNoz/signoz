package querier

import (
	"context"
	"math"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeClickHouseQueryTimeout = errors.MustNewCode("query_timeout")

// settings returns the budget as ClickHouse query settings. A SETTINGS clause in the user's SQL
// overrides them.
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
