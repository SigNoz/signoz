package sqlmigration

import (
	"context"
	"hash/fnv"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addKeyOrganization struct {
	sqlstore sqlstore.SQLStore
}

func NewAddKeyOrganizationFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_key_organization"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddKeyOrganization(ctx, providerSettings, config, sqlstore)
	})
}

func newAddKeyOrganization(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addKeyOrganization{
		sqlstore: sqlstore,
	}, nil
}

func (migration *addKeyOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addKeyOrganization) Up(ctx context.Context, db *bun.DB) error {
	ok, err := migration.sqlstore.Dialect().ColumnExists(ctx, db, "organizations", "key")
	if err != nil {
		return err
	}

	if ok {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.
		NewAddColumn().
		Table("organizations").
		ColumnExpr("key BIGINT").
		Exec(ctx); err != nil {
		return err
	}

	var existingOrgIDs []string
	if err := tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &existingOrgIDs); err != nil {
		return err
	}

	for _, orgID := range existingOrgIDs {
		key := migration.getHash(ctx, orgID)
		if _, err := tx.
			NewUpdate().
			Table("organizations").
			Set("key = ?", key).
			Where("id = ?", orgID).
			Exec(ctx); err != nil {
			return err
		}
	}

	if _, err := tx.
		NewCreateIndex().
		Unique().
		IfNotExists().
		Index("idx_unique_key").
		Table("organizations").
		Column("key").
		Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addKeyOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *addKeyOrganization) getHash(_ context.Context, orgID string) uint32 {
	hasher := fnv.New32a()

	// Hasher never returns err.
	_, _ = hasher.Write([]byte(orgID))
	return hasher.Sum32()
}
