package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTags struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddTagsFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_tags"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addTags{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addTags) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addTags) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	tagTableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "tag",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "key", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "value", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tagTableSQLs...)

	// // Case-insensitive uniqueness on (org_id, kind, key, value) — both Postgres
	// // and SQLite (modernc 3.50.x) support expression indexes.
	// tagUniqueIndexSQLs := migration.sqlschema.Operator().CreateIndex(
	// 	(&sqlschema.UniqueIndex{
	// 		TableName:   "tag",
	// 		ColumnNames: []sqlschema.ColumnName{"org_id", "kind", "key", "value"},
	// 		Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
	// 	}).Named("uq_tag_org_kind_lower_key_lower_value"),
	// )
	// sqls = append(sqls, tagUniqueIndexSQLs...)

	tagRelationsTableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "tag_relation",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "resource_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "tag_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("tag_id"),
				ReferencedTableName:   sqlschema.TableName("tag"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tagRelationsTableSQLs...)

	tagRelationUniqueIndexSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "tag_relation",
			ColumnNames: []sqlschema.ColumnName{"kind", "resource_id", "tag_id"},
		},
	)
	sqls = append(sqls, tagRelationUniqueIndexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addTags) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
