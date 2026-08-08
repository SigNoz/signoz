package sqlmigration

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

const httpRequestMethodCurrent = "http.request.method"

type migrateHTTPMethodQuickFilter struct {
	logger *slog.Logger
}

func NewMigrateHTTPMethodQuickFilterFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_http_method_filter"),
		func(_ context.Context, settings factory.ProviderSettings, _ Config) (SQLMigration, error) {
			return &migrateHTTPMethodQuickFilter{logger: settings.Logger}, nil
		},
	)
}

func (migration *migrateHTTPMethodQuickFilter) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func httpRequestMethodOld() string {
	members := semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{
		Name:         httpRequestMethodCurrent,
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextAttribute,
	})
	if len(members) < 2 {
		return httpRequestMethodCurrent
	}
	return members[1]
}

func (migration *migrateHTTPMethodQuickFilter) migrate(ctx context.Context, db *bun.DB, from, to string) error {
	shared := migrateDeploymentEnvironmentQuickFilter{logger: migration.logger}
	return shared.migrate(ctx, db, from, to)
}

func (migration *migrateHTTPMethodQuickFilter) Up(ctx context.Context, db *bun.DB) error {
	return migration.migrate(ctx, db, httpRequestMethodOld(), httpRequestMethodCurrent)
}

func (migration *migrateHTTPMethodQuickFilter) Down(ctx context.Context, db *bun.DB) error {
	return migration.migrate(ctx, db, httpRequestMethodCurrent, httpRequestMethodOld())
}
