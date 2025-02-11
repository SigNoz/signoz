package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addPipelines struct{}

func NewAddPipelinesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_pipelines"), newAddPipelines)
}

func newAddPipelines(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPipelines{}, nil
}

func (migration *addPipelines) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPipelines) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:pipelines"`
			ID            string    `bun:"id,pk,type:text"`
			OrderID       int       `bun:"order_id"`
			Enabled       bool      `bun:"enabled"`
			CreatedBy     string    `bun:"created_by,type:text"`
			CreatedAt     time.Time `bun:"created_at,default:current_timestamp"`
			Name          string    `bun:"name,type:varchar(400),notnull"`
			Alias         string    `bun:"alias,type:varchar(20),notnull"`
			Description   string    `bun:"description,type:text"`
			Filter        string    `bun:"filter,type:text,notnull"`
			ConfigJSON    string    `bun:"config_json,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPipelines) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
