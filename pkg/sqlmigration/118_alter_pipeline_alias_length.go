package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type alterPipelineAliasLength struct {
	store sqlstore.SQLStore
}

func NewAlterPipelineAliasLengthFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("alter_pipeline_alias_length"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &alterPipelineAliasLength{store: sqlstore}, nil
	})
}

func (migration *alterPipelineAliasLength) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *alterPipelineAliasLength) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, "ALTER TABLE pipelines ALTER COLUMN alias TYPE varchar(400);"); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *alterPipelineAliasLength) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
