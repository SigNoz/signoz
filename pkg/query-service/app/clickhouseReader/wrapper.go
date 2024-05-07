package clickhouseReader

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type ClickhouseQuerySettings struct {
	MaxExecutionTimeLeaf                string
	TimeoutBeforeCheckingExecutionSpeed string
	MaxBytesToRead                      string
	OptimizeReadInOrderRegex            string
	OptimizeReadInOrderRegexCompiled    *regexp.Regexp
}

type clickhouseConnWrapper struct {
	conn     clickhouse.Conn
	settings ClickhouseQuerySettings
}

func (c clickhouseConnWrapper) Close() error {
	return c.conn.Close()
}

func (c clickhouseConnWrapper) Ping(ctx context.Context) error {
	return c.conn.Ping(ctx)
}

func (c clickhouseConnWrapper) Stats() driver.Stats {
	return c.conn.Stats()
}

func (c clickhouseConnWrapper) addClickHouseSettings(ctx context.Context, query string) context.Context {
	settings := clickhouse.Settings{}

	logComment := c.getLogComment(ctx)
	if logComment != "" {
		settings["log_comment"] = logComment
	}

	// don't add resource restrictions traces
	if strings.Contains(query, "signoz_traces") {
		ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
		return ctx
	}

	if c.settings.MaxBytesToRead != "" {
		settings["max_bytes_to_read"] = c.settings.MaxBytesToRead
	}

	if c.settings.MaxExecutionTimeLeaf != "" {
		settings["max_execution_time_leaf"] = c.settings.MaxExecutionTimeLeaf
	}

	if c.settings.TimeoutBeforeCheckingExecutionSpeed != "" {
		settings["timeout_before_checking_execution_speed"] = c.settings.TimeoutBeforeCheckingExecutionSpeed
	}

	// only list queries of
	if c.settings.OptimizeReadInOrderRegex != "" && c.settings.OptimizeReadInOrderRegexCompiled.Match([]byte(query)) {
		settings["optimize_read_in_order"] = 0
	}

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(settings))
	return ctx
}

func (c clickhouseConnWrapper) getLogComment(ctx context.Context) string {
	// Get the key-value pairs from context for log comment
	kv := ctx.Value("log_comment")
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

func (c clickhouseConnWrapper) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	return c.conn.Query(c.addClickHouseSettings(ctx, query), query, args...)
}

func (c clickhouseConnWrapper) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	return c.conn.QueryRow(c.addClickHouseSettings(ctx, query), query, args...)
}

func (c clickhouseConnWrapper) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return c.conn.Select(c.addClickHouseSettings(ctx, query), dest, query, args...)
}

func (c clickhouseConnWrapper) Exec(ctx context.Context, query string, args ...interface{}) error {
	return c.conn.Exec(c.addClickHouseSettings(ctx, query), query, args...)
}

func (c clickhouseConnWrapper) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	return c.conn.AsyncInsert(c.addClickHouseSettings(ctx, query), query, wait, args...)
}

func (c clickhouseConnWrapper) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	return c.conn.PrepareBatch(c.addClickHouseSettings(ctx, query), query, opts...)
}

func (c clickhouseConnWrapper) ServerVersion() (*driver.ServerVersion, error) {
	return c.conn.ServerVersion()
}

func (c clickhouseConnWrapper) Contributors() []string {
	return c.conn.Contributors()
}
