package sqlstorehook

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
)

type logging struct {
	logger *slog.Logger
	level  slog.Level
}

func NewLoggingFactory() factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("logging"), NewLogging)
}

func NewLogging(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStoreHook, error) {
	return &logging{
		logger: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook").Logger(),
		level:  slog.LevelDebug,
	}, nil
}

func (*logging) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	return ctx
}

func (hook *logging) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
	hook.logger.Log(
		ctx,
		hook.level,
		"::SQLSTORE-QUERY::",
		"db_query_operation", event.Operation(),
		"db_query_text", event.Query,
		"db_query_duration", time.Since(event.StartTime).String(),
	)
}
