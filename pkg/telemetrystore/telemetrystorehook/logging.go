package telemetrystorehook

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type logging struct {
	logger *slog.Logger
	level  slog.Level
}

func NewLoggingFactory() factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("logging"), NewLogging)
}

func NewLogging(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStoreHook, error) {
	return &logging{
		logger: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystorehook").Logger(),
		level:  slog.LevelDebug,
	}, nil
}

func (logging) BeforeQuery(ctx context.Context, event *telemetrystore.QueryEvent) context.Context {
	return ctx
}

func (hook *logging) AfterQuery(ctx context.Context, event *telemetrystore.QueryEvent) {
	level := hook.level
	args := []any{
		"db.query.text", event.Query,
		"db.query.args", event.QueryArgs,
		"db.duration", time.Since(event.StartTime).String(),
	}
	if event.Err != nil && !errors.Is(event.Err, sql.ErrNoRows) && !errors.Is(event.Err, context.Canceled) {
		level = slog.LevelError
		args = append(args, "db.query.error", event.Err)
	}

	hook.logger.Log(
		ctx,
		level,
		"::TELEMETRYSTORE-QUERY::",
		args...,
	)
}
