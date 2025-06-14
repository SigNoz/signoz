package telemetrystore

import (
	"time"
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
