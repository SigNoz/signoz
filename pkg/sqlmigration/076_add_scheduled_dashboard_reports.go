package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/dashboardreporttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addScheduledDashboardReports struct{}

func NewAddScheduledDashboardReportsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_scheduled_dashboard_reports"),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
			return newAddScheduledDashboardReports(ctx, providerSettings, config)
		},
	)
}

func newAddScheduledDashboardReports(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addScheduledDashboardReports{}, nil
}

func (migration *addScheduledDashboardReports) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReports) Up(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:scheduled_reports,alias:scheduled_reports"`

			ID valuer.UUID `bun:"id,pk,type:text"`

			OrgID       string                                      `bun:"org_id,type:text,notnull"`
			DashboardID valuer.UUID                                 `bun:"dashboard_id,type:text,notnull"`
			Name        string                                      `bun:"name,type:text,notnull"`
			Recipients  dashboardreporttypes.DashboardReportRecipients `bun:"recipients,type:text,notnull"`
			Schedule    dashboardreporttypes.DashboardReportSchedule   `bun:"schedule,type:text,notnull"`
			TimeRange   dashboardreporttypes.DashboardReportTimeRange `bun:"time_range,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (migration *addScheduledDashboardReports) Down(context.Context, *bun.DB) error {
	return nil
}

