package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateQuickFilters struct {
	store sqlstore.SQLStore
}

func NewUpdateQuickFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateQuickFilters(ctx, ps, c, store)
	})
}

func newUpdateQuickFilters(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateQuickFilters{
		store: store,
	}, nil
}

func (migration *updateQuickFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Delete all existing quick filters
	_, err = tx.NewDelete().
		Table("quick_filter").
		Where("1=1"). // Delete all rows
		Exec(ctx)
	if err != nil {
		return err
	}

	// Get all organization IDs as strings
	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil {
		if err == sql.ErrNoRows {
			// No organizations found, commit the transaction (deletion is done) and return
			if err := tx.Commit(); err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// For each organization, create new quick filters with the updated NewDefaultQuickFilter function
	for _, orgID := range orgIDs {
		// Get the updated default quick filters
		storableQuickFilters, err := quickfiltertypes.NewDefaultQuickFilter(valuer.MustNewUUID(orgID))
		if err != nil {
			return err
		}

		// Insert all filters for this organization
		_, err = tx.NewInsert().
			Model(&storableQuickFilters).
			Exec(ctx)

		if err != nil {
			if errors.Ast(migration.store.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "Quick Filter already exists"), errors.TypeAlreadyExists) {
				// Skip if filters already exist for this org
				continue
			}
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (migration *updateQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
