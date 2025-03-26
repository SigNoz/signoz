package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
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
			bun.BaseModel `bun:"table:trace_funnels"`
			UUID          string    `bun:"uuid,pk,type:text"`
			OrgID         string    `json:"orgId" bun:"org_id,notnull"`
			Name          string    `bun:"name,type:text,notnull"`
			Category      string    `bun:"category,type:text,notnull"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			CreatedBy     string    `bun:"created_by,type:text"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			UpdatedBy     string    `bun:"updated_by,type:text"`
			SourcePage    string    `bun:"source_page,type:text,notnull"`
			Tags          string    `bun:"tags,type:text"`
			Data          string    `bun:"data,type:text,notnull"`
			ExtraData     string    `bun:"extra_data,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addTraceFunnels) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
