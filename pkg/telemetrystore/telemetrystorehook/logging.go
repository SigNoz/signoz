package telemetrystorehook

import (
	"context"
	"log/slog"
	"time"

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
	hook.logger.Log(
		ctx,
		hook.level,
		"::TELEMETRYSTORE-QUERY::",
		"db.query.text", event.Query,
		"db.query.args", event.QueryArgs,
		"db.duration", time.Since(event.StartTime).String(),
	)
}
