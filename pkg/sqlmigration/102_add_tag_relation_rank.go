package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTagRelationRank struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddTagRelationRankFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_tag_relation_rank"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addTagRelationRank{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addTagRelationRank) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addTagRelationRank) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("tag_relation"))
	if err != nil {
		return err
	}

	rankColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("rank"),
		DataType: sqlschema.DataTypeInteger,
		Nullable: false,
	}
	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, rankColumn, 0)

	// AddColumn recreates the table for a NOT NULL column on SQLite, which drops
	// standalone indices. GetTable only reports inline table constraints, so
	// restore the standalone unique index from migration 082.
	sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   sqlschema.TableName("tag_relation"),
		ColumnNames: []sqlschema.ColumnName{"kind", "resource_id", "tag_id"},
	})...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addTagRelationRank) Down(context.Context, *bun.DB) error {
	return nil
}
