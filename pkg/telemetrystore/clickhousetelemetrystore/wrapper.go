package clickhousetelemetrystore

import (
	"context"
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/telemetrystore"
)

type clickHouseWrapper struct {
	conn     clickhouse.Conn
	settings telemetrystore.ClickHouseQuerySettings
}

func wrapClickhouseConn(conn clickhouse.Conn, settings telemetrystore.ClickHouseQuerySettings) clickHouseWrapper {
	return clickHouseWrapper{
		conn:     conn,
		settings: settings,
	}
}

func (c clickHouseWrapper) Close() error {
	return c.conn.Close()
}

func (c clickHouseWrapper) Ping(ctx context.Context) error {
	return c.conn.Ping(ctx)
}

func (c clickHouseWrapper) Stats() driver.Stats {
	return c.conn.Stats()
}

func (c clickHouseWrapper) addClickHouseSettings(ctx context.Context) context.Context {
	settings := clickhouse.Settings{}

	logComment := c.getLogComment(ctx)
	if logComment != "" {
		settings["log_comment"] = logComment
	}

	if ctx.Value("enforce_max_result_rows") != nil {
		settings["max_result_rows"] = c.settings.MaxResultRowsForCHQuery
	}

	if c.settings.MaxBytesToRead != 0 {
		settings["max_bytes_to_read"] = c.settings.MaxBytesToRead
	}

	if c.settings.MaxExecutionTime != 0 {
		settings["max_execution_time"] = c.settings.MaxExecutionTime
	}

	if c.settings.MaxExecutionTimeLeaf != 0 {
		settings["max_execution_time_leaf"] = c.settings.MaxExecutionTimeLeaf
	}

	if c.settings.TimeoutBeforeCheckingExecutionSpeed != 0 {
		settings["timeout_before_checking_execution_speed"] = c.settings.TimeoutBeforeCheckingExecutionSpeed
	}

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
	return ctx
}

func (c clickHouseWrapper) getLogComment(ctx context.Context) string {
	// Get the key-value pairs from context for log comment
	kv := ctx.Value(common.LogCommentKey)
	if kv == nil {
		return ""
	}

	logCommentKVs, ok := kv.(map[string]string)
	if !ok {
		return ""
	}

	logComment, _ := json.Marshal(logCommentKVs)

	return string(logComment)
}

func (c clickHouseWrapper) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	return c.conn.Query(c.addClickHouseSettings(ctx), query, args...)
}

func (c clickHouseWrapper) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	return c.conn.QueryRow(c.addClickHouseSettings(ctx), query, args...)
}

func (c clickHouseWrapper) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return c.conn.Select(c.addClickHouseSettings(ctx), dest, query, args...)
}

func (c clickHouseWrapper) Exec(ctx context.Context, query string, args ...interface{}) error {
	return c.conn.Exec(c.addClickHouseSettings(ctx), query, args...)
}

func (c clickHouseWrapper) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	return c.conn.AsyncInsert(c.addClickHouseSettings(ctx), query, wait, args...)
}

func (c clickHouseWrapper) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	return c.conn.PrepareBatch(c.addClickHouseSettings(ctx), query, opts...)
}

func (c clickHouseWrapper) ServerVersion() (*driver.ServerVersion, error) {
	return c.conn.ServerVersion()
}

func (c clickHouseWrapper) Contributors() []string {
	return c.conn.Contributors()
}
