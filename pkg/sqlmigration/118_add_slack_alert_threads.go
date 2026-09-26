package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addSlackAlertThreads struct {
	sqlstore sqlstore.SQLStore
}

func NewAddSlackAlertThreadsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_slack_alert_threads"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addSlackAlertThreads{
			sqlstore: sqlstore,
		}, nil
	})
}

func (migration *addSlackAlertThreads) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addSlackAlertThreads) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:slack_alert_threads"`
			ID            uint64    `bun:"id,pk,autoincrement"`
			OrgID         string    `bun:"org_id,notnull"`
			GroupKey      string    `bun:"group_key,notnull,unique"`
			ThreadTs      string    `bun:"thread_ts,notnull"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *addSlackAlertThreads) Down(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.NewDropTable().Table("slack_alert_threads").IfExists().Exec(ctx); err != nil {
		return err
	}

	return tx.Commit()
}
