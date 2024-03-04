package logs

import (
	"context"

	"github.com/SigNoz/signoz-otel-collector/migrationmanager/migrators/basemigrator"
)

const (
	name            = "logs"
	database        = "signoz_logs"
	migrationFolder = "migrationmanager/migrators/logs/migrations"
)

type LogsMigrator struct {
	*basemigrator.BaseMigrator
}

func (m *LogsMigrator) Migrate(ctx context.Context) error {
	return m.BaseMigrator.Migrate(ctx, database, migrationFolder)
}

func (m *LogsMigrator) Name() string {
	return name
}
