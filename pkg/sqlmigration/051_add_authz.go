package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addAuthz struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddAuthzFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_authz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddAuthz(ctx, ps, c, sqlstore, sqlschema)
	})
}

func newAddAuthz(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addAuthz{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addAuthz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAuthz) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}
	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "tuple",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "object_type", "object_id", "relation", "user_object_type", "user_object_id", "user_relation"}},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "tuple", ColumnNames: []sqlschema.ColumnName{"ulid"}})
	sqls = append(sqls, indexSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "authorization_model",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "schema_version", DataType: sqlschema.DataTypeText, Nullable: false, Default: "1.1"},
			{Name: "serialized_protobuf", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "store",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "deleted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "assertion",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "assertions", DataType: sqlschema.DataTypeText, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "changelog",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "operation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
	})
	sqls = append(sqls, tableSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *addAuthz) Down(context.Context, *bun.DB) error {
	return nil
}
