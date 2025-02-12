package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addDataMigrations struct{}

func NewAddDataMigrationsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_data_migrations"), newAddDataMigrations)
}

func newAddDataMigrations(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDataMigrations{}, nil
}

func (migration *addDataMigrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addDataMigrations) Up(ctx context.Context, db *bun.DB) error {
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

func (migration *addDataMigrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
