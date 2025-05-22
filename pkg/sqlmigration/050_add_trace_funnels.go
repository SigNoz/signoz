package sqlmigration

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTraceFunnels struct {
	sqlstore sqlstore.SQLStore
}

func NewAddTraceFunnelsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.
		NewProviderFactory(factory.
			MustNewName("add_trace_funnels"),
			func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
				return newAddTraceFunnels(ctx, providerSettings, config, sqlstore)
			})
}

func newAddTraceFunnels(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addTraceFunnels{sqlstore: sqlstore}, nil
}

func (migration *addTraceFunnels) Register(migrations *migrate.Migrations) error {
	if err := migrations.
		Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addTraceFunnels) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Create trace_funnel table with foreign key constraint inline
	_, err = tx.NewCreateTable().
		Model((*traceFunnels.Funnel)(nil)).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create trace_funnel table: %v", err)
	}

	// Add unique constraint for org_id and name
	//_, err = tx.NewRaw(`
	//	CREATE UNIQUE INDEX IF NOT EXISTS idx_trace_funnel_org_id_name
	//	ON trace_funnel (org_id, name)
	//`).Exec(ctx)
	//if err != nil {
	//	return fmt.Errorf("failed to create unique constraint: %v", err)
	//}

	// Create indexes
	_, err = tx.NewCreateIndex().
		Model((*traceFunnels.Funnel)(nil)).
		Index("idx_trace_funnel_org_id").
		Column("org_id").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create org_id index: %v", err)
	}

	_, err = tx.NewCreateIndex().
		Model((*traceFunnels.Funnel)(nil)).
		Index("idx_trace_funnel_created_at").
		Column("created_at").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create created_at index: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addTraceFunnels) Down(ctx context.Context, db *bun.DB) error {
	//tx, err := db.BeginTx(ctx, nil)
	//if err != nil {
	//	return err
	//}
	//defer tx.Rollback()
	//
	//// Drop trace_funnel table
	//_, err = tx.NewDropTable().
	//	Model((*traceFunnels.Funnel)(nil)).
	//	IfExists().
	//	Exec(ctx)
	//if err != nil {
	//	return fmt.Errorf("failed to drop trace_funnel table: %v", err)
	//}
	//
	//if err := tx.Commit(); err != nil {
	//	return err
	//}

	return nil
}
