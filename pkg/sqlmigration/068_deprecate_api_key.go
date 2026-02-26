package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type deprecateAPIKey struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewDeprecateAPIKeyFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("deprecate_api_key"), func(_ context.Context, _ factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &deprecateAPIKey{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *deprecateAPIKey) Register(migrations *migrate.Migrations) error {
	err := migrations.Register(migration.Up, migration.Down)
	if err != nil {
		return err
	}

	return nil
}

func (migration *deprecateAPIKey) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	// TODO[@vikrantgupta25]: migrate the older keys to the new table
	deprecatedFactorAPIKey, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("factor_api_key"))
	dropTableSQLS := migration.sqlschema.Operator().DropTable(deprecatedFactorAPIKey)
	sqls = append(sqls, dropTableSQLS...)

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "factor_api_key",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "key", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "expires_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "last_used", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "service_account_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("service_account_id"),
				ReferencedTableName:   sqlschema.TableName("service_account"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "factor_api_key", ColumnNames: []sqlschema.ColumnName{"key"}})
	sqls = append(sqls, indexSQLs...)

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

func (migration *deprecateAPIKey) Down(context.Context, *bun.DB) error {
	return nil
}
