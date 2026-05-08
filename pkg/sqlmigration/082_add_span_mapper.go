package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addSpanMapper struct {
	sqlschema sqlschema.SQLSchema
	sqlstore  sqlstore.SQLStore
}

func NewAddSpanMapperFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_span_mapper"), func(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
		return &addSpanMapper{sqlschema: sqlschema, sqlstore: sqlstore}, nil
	})
}

func (migration *addSpanMapper) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addSpanMapper) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	groupSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "span_mapper_group",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "category", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "condition", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
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
	sqls = append(sqls, groupSQLs...)

	groupIdxSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "span_mapper_group",
			ColumnNames: []sqlschema.ColumnName{"org_id", "name"},
		})
	sqls = append(sqls, groupIdxSQLs...)

	mapperSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "span_mapper",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "group_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "field_context", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "config", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("group_id"),
				ReferencedTableName:   sqlschema.TableName("span_mapper_group"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, mapperSQLs...)

	mapperIdxSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "span_mapper",
			ColumnNames: []sqlschema.ColumnName{"group_id", "name"},
		})
	sqls = append(sqls, mapperIdxSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addSpanMapper) Down(context.Context, *bun.DB) error {
	return nil
}
