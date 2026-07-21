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
	// tag_relation has an FK to tag; disable FK enforcement for SQLite's
	// recreate-table fallback.
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

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

	// rank records a tag's position within its resource. Existing rows backfill to 0.
	rankColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("rank"),
		DataType: sqlschema.DataTypeInteger,
		Nullable: false,
	}
	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, rankColumn, 0)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *addTagRelationRank) Down(context.Context, *bun.DB) error {
	return nil
}
