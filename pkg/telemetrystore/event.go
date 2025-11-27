package telemetrystore

import (
	"strings"
	"time"
	"unicode"
)

type QueryEvent struct {
	Query     string
	QueryArgs []any
	StartTime time.Time
	Operation string
	Err       error
}

func NewQueryEvent(query string, args []any) *QueryEvent {
	return &QueryEvent{
		Query:     query,
		QueryArgs: args,
		StartTime: time.Now(),
		Operation: queryOperation(query),
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
