package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTagUniqueIndex struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddTagUniqueIndexFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_tag_unique_index"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addTagUniqueIndex{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addTagUniqueIndex) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addTagUniqueIndex) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndexWithExpressions{
			TableName:   "tag",
			Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
		},
	)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addTagUniqueIndex) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
