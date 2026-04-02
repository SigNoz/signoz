package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addScheduledDashboardReportVariables struct{}

func NewAddScheduledDashboardReportVariablesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_sched_report_variables"),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
			return newAddScheduledDashboardReportVariables(ctx, providerSettings, config)
		},
	)
}

func newAddScheduledDashboardReportVariables(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addScheduledDashboardReportVariables{}, nil
}

func (migration *addScheduledDashboardReportVariables) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReportVariables) Up(ctx context.Context, db *bun.DB) error {
	stmt := `ALTER TABLE scheduled_reports ADD COLUMN variables TEXT NOT NULL DEFAULT '{}'`

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, stmt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReportVariables) Down(context.Context, *bun.DB) error {
	return nil
}

