package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
	// table:virtual_field op:create
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:virtual_field"`

			types.Identifiable
			types.TimeAuditable
			types.UserAuditable

			Name        string                `bun:"name,type:text,notnull"`
			Expression  string                `bun:"expression,type:text,notnull"`
			Description string                `bun:"description,type:text"`
			Signal      telemetrytypes.Signal `bun:"signal,type:text,notnull"`
			OrgID       string                `bun:"org_id,type:text,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addVirtualFields) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
