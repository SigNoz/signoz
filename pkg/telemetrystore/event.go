package telemetrystore

import (
	"strings"
	"time"
	"unicode"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type QueryEvent struct {
	Query     string
	QueryArgs []any
	StartTime time.Time
	Operation string
	Err       error

	// Settings are sent with the query. Hooks add to them; the store sends them once the hooks have run.
	Settings clickhouse.Settings
}

func NewQueryEvent(query string, args []any) *QueryEvent {
	return &QueryEvent{
		Query:     query,
		QueryArgs: args,
		StartTime: time.Now(),
		Operation: queryOperation(query),
		Settings:  clickhouse.Settings{},
	}
}

func queryOperation(query string) string {
	queryOp := strings.TrimLeftFunc(query, unicode.IsSpace)

	if idx := strings.IndexByte(queryOp, ' '); idx > 0 {
		queryOp = queryOp[:idx]
	}
	if len(queryOp) > 16 {
		queryOp = queryOp[:16]
	}
	return queryOp
}
