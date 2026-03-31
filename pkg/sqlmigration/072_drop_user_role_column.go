package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropUserRoleColumn struct {
	sqlStore  sqlstore.SQLStore
	sqlSchema sqlschema.SQLSchema
}

func NewDropUserRoleColumnFactory(sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_user_role_column"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &dropUserRoleColumn{
			sqlStore:  sqlStore,
			sqlSchema: sqlSchema,
		}, nil
	})
}

func (migration *dropUserRoleColumn) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropUserRoleColumn) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, _, err := migration.sqlSchema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	roleColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("role"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlSchema.Operator().DropColumn(table, roleColumn)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *dropUserRoleColumn) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
