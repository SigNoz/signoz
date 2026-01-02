package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type renameOrgDomains struct {
	sqlStore  sqlstore.SQLStore
	sqlSchema sqlschema.SQLSchema
}

func NewRenameOrgDomainsFactory(sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("rename_org_domains"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newRenameOrgDomains(ctx, ps, c, sqlStore, sqlSchema)
	})
}

func newRenameOrgDomains(_ context.Context, _ factory.ProviderSettings, _ Config, sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) (SQLMigration, error) {
	return &renameOrgDomains{
		sqlStore:  sqlStore,
		sqlSchema: sqlSchema,
	}, nil
}

func (migration *renameOrgDomains) Up(ctx context.Context, db *bun.DB) error {
	// ? do we need to add any checks here for pg or sqlite?

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// check if the `auth_domain` table already exists
	_, _, err = migration.sqlSchema.GetTable(ctx, sqlschema.TableName("auth_domain"))
	if err == nil {
		return nil
	}

	table, _, err := migration.sqlSchema.GetTable(ctx, sqlschema.TableName("org_domains"))
	if err != nil {
		return err
	}

	renameTableSQL := migration.sqlSchema.Operator().RenameTable(table, sqlschema.TableName("auth_domain"))

	for _, sql := range renameTableSQL {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *renameOrgDomains) Down(_ context.Context, _ *bun.DB) error {
	return nil
}

func (migration *renameOrgDomains) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}
