package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addServiceAccount struct {
	sqlschema sqlschema.SQLSchema
	sqlstore  sqlstore.SQLStore
}

func NewAddServiceAccountFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_service_account"), func(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
		return &addServiceAccount{
			sqlschema: sqlschema,
			sqlstore:  sqlstore,
		}, nil
	})
}

func (migration *addServiceAccount) Register(migrations *migrate.Migrations) error {
	err := migrations.Register(migration.Up, migration.Down)
	if err != nil {
		return err
	}

	return nil
}

func (migration *addServiceAccount) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "service_account",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "deleted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "email", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "status", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "service_account", ColumnNames: []sqlschema.ColumnName{"name", "org_id", "deleted_at"}})
	sqls = append(sqls, indexSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "service_account_role",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "service_account_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "role_id", DataType: sqlschema.DataTypeText, Nullable: false},
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
			{
				ReferencingColumnName: sqlschema.ColumnName("role_id"),
				ReferencedTableName:   sqlschema.TableName("role"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "service_account_role", ColumnNames: []sqlschema.ColumnName{"service_account_id", "role_id"}})
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

func (a *addServiceAccount) Down(context.Context, *bun.DB) error {
	return nil
}
