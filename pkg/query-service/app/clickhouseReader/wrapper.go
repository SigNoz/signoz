package clickhouseReader

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type clickhouseConnWrapper struct {
	conn clickhouse.Conn
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

func (c clickhouseConnWrapper) logComment(ctx context.Context) context.Context {
	// Get the key-value pairs from context for log comment
	kv := ctx.Value("log_comment")
	if kv == nil {
		return ctx
	}

	logCommentKVs, ok := kv.(map[string]string)
	if !ok {
		return ctx
	}

	logComment := ""
	for k, v := range logCommentKVs {
		logComment += fmt.Sprintf("%s=%s, ", k, v)
	}
	logComment = strings.TrimSuffix(logComment, ", ")

	ctx = clickhouse.Context(ctx, clickhouse.WithSettings(clickhouse.Settings{
		"log_comment": logComment,
	}))
	return ctx
}

func (c clickhouseConnWrapper) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	return c.conn.Query(c.logComment(ctx), query, args...)
}

func (c clickhouseConnWrapper) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	return c.conn.QueryRow(c.logComment(ctx), query, args...)
}

func (c clickhouseConnWrapper) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return c.conn.Select(c.logComment(ctx), dest, query, args...)
}

func (c clickhouseConnWrapper) Exec(ctx context.Context, query string, args ...interface{}) error {
	return c.conn.Exec(c.logComment(ctx), query, args...)
}

func (c clickhouseConnWrapper) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	return c.conn.AsyncInsert(c.logComment(ctx), query, wait, args...)
}

func (c clickhouseConnWrapper) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	return c.conn.PrepareBatch(c.logComment(ctx), query, opts...)
}

func (c clickhouseConnWrapper) ServerVersion() (*driver.ServerVersion, error) {
	return c.conn.ServerVersion()
}

func (c clickhouseConnWrapper) Contributors() []string {
	return c.conn.Contributors()
}
