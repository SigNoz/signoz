package sqlstorehook

import (
	"context"
	"log/slog"
	"time"

	"github.com/uptrace/bun"
)

type debug struct {
	bun.QueryHook
	logger *slog.Logger
	level  slog.Level
}

func NewDebug(logger *slog.Logger, level slog.Level) bun.QueryHook {
	return &debug{
		logger: logger,
		level:  level,
	}
}

func (debug) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	return ctx
}

func (hook debug) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
	hook.logger.Log(ctx, hook.level, "::SQLSTORE-QUERY::", "db.query.operation", event.Operation(), "db.query.text", event.Query, "db.duration", time.Since(event.StartTime).String())
}
