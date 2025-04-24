package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTraceFunnels struct{}

func NewAddTraceFunnelsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_trace_funnels"), newAddTraceFunnels)
}

func newAddTraceFunnels(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addTraceFunnels{}, nil
}

func (migration *addTraceFunnels) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addTraceFunnels) Up(ctx context.Context, db *bun.DB) error {
	// table:trace_funnels op:create
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:trace_funnel"`
			types.Identifiable
			OrgID string `bun:"org_id,notnull"`
			Name  string `bun:"name,type:text,notnull"`
			types.TimeAuditable
			types.UserAuditable
			Data        string `bun:"data,type:text,notnull"`
			Description string `bun:"description,type:text"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addTraceFunnels) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
