package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addDataMigration struct{}

func NewAddDataMigrationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_data_migration"), newAddDataMigration)
}

func newAddDataMigration(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDataMigration{}, nil
}

func (migration *addDataMigration) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addDataMigration) Up(ctx context.Context, db *bun.DB) error {

	lastAppliedMigration := ""
	err := db.NewSelect().Column("name").Table("migration").OrderExpr("id DESC").Limit(1).Scan(ctx, &lastAppliedMigration)
	if err != nil {
		return err
	}
	if lastAppliedMigration != "032" {
		return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "please migrate to signoz v0.80 and then to the latest")
	}

	// table:data_migrations
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:data_migrations"`
			ID            int       `bun:"id,pk,autoincrement"`
			Version       string    `bun:"version,unique,notnull,type:VARCHAR(255)"`
			CreatedAt     time.Time `bun:"created_at,notnull,default:current_timestamp"`
			Succeeded     bool      `bun:"succeeded,notnull,default:false"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addDataMigration) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
