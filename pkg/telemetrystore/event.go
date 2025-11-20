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
	Err       error
}

func NewQueryEvent(query string, args []any) *QueryEvent {
	return &QueryEvent{
		Query:     query,
		QueryArgs: args,
		StartTime: time.Now(),
	}
}

func (e *QueryEvent) Operation() string {
	return queryOperation(e.Query)
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
