package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addVirtualFields struct{}

func NewAddVirtualFieldsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_virtual_fields"), newAddVirtualFields)
}

func newAddVirtualFields(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addVirtualFields{}, nil
}

func (migration *addVirtualFields) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addVirtualFields) Up(ctx context.Context, db *bun.DB) error {
	// table:virtual_fields op:create
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:virtual_fields"`
			UUID          string    `bun:"uuid,pk,type:text"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			CreatedBy     string    `bun:"created_by,type:text"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			UpdatedBy     string    `bun:"updated_by,type:text"`
			Name          string    `bun:"name,type:text,notnull"`
			Expression    string    `bun:"expression,type:text,notnull"`
			Description   string    `bun:"description,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addVirtualFields) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
