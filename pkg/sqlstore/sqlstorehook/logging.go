package sqlstorehook

import (
	"context"
	"log/slog"
	"time"

	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type logging struct {
	bun.QueryHook
	logger *slog.Logger
	level  slog.Level
}

func NewLoggingFactory() factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("logging"), NewLogging)
}

func NewLogging(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStoreHook, error) {
	return &logging{
		logger: factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlstore/sqlstorehook").Logger(),
		level:  slog.LevelDebug,
	}, nil
}

func (logging) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	return ctx
}

func (hook logging) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
	hook.logger.Log(
		ctx,
		hook.level,
		"::SQLSTORE-QUERY::",
		"db.query.operation", event.Operation(),
		"db.query.text", event.Query,
		"db.duration", time.Since(event.StartTime).String(),
	)
}
