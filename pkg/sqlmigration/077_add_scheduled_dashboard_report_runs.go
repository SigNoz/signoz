package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addScheduledDashboardReportRuns struct{}

func NewAddScheduledDashboardReportRunsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_sched_report_runs"),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
			return newAddScheduledDashboardReportRuns(ctx, providerSettings, config)
		},
	)
}

func newAddScheduledDashboardReportRuns(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addScheduledDashboardReportRuns{}, nil
}

func (migration *addScheduledDashboardReportRuns) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReportRuns) Up(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:scheduled_report_runs,alias:scheduled_report_runs"`

			ID valuer.UUID `bun:"id,pk,type:text"`

			ScheduledReportID valuer.UUID `bun:"scheduled_report_id,type:text,notnull,unique:scheduled_report_runs_u1"`
			OrgID             string      `bun:"org_id,type:text,notnull,unique:scheduled_report_runs_u1"`
			RunStartMs        uint64      `bun:"run_start_ms,notnull,type:bigint,unique:scheduled_report_runs_u1"`
			RunEndMs          uint64      `bun:"run_end_ms,notnull,type:bigint,unique:scheduled_report_runs_u1"`

			Status      string  `bun:"status,type:text,notnull"`
			ErrorReason *string `bun:"error_reason,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReportRuns) Down(context.Context, *bun.DB) error {
	return nil
}
