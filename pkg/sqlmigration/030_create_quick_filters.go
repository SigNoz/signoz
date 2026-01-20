package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type createQuickFilters struct {
	store sqlstore.SQLStore
}

type quickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  string `bun:"org_id,notnull,unique:org_id_signal,type:text"`
	Filter string `bun:"filter,notnull,type:text"`
	Signal string `bun:"signal,notnull,unique:org_id_signal,type:text"`
	types.TimeAuditable
	types.UserAuditable
}

func NewCreateQuickFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &createQuickFilters{store: store}, nil
	})
}

func (m *createQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *createQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Create table if not exists
	_, err = tx.NewCreateTable().
		Model((*quickFilter)(nil)).
		IfNotExists().
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE`).
		Exec(ctx)
	if err != nil {
		return err
	}

	// Get default organization ID
	var defaultOrg valuer.UUID
	err = tx.NewSelect().Table("organizations").Column("id").Limit(1).Scan(ctx, &defaultOrg)
	if err != nil {
		if err == sql.ErrNoRows {
			// No organizations found, nothing to insert, commit and return
			err := tx.Commit()
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// Get the default quick filters
	storableQuickFilters, err := quickfiltertypes.NewDefaultQuickFilter(defaultOrg)
	if err != nil {
		return err
	}

	// Insert all filters at once
	_, err = tx.NewInsert().
		Model(&storableQuickFilters).
		Exec(ctx)

	if err != nil {
		if errors.Ast(m.store.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "Quick Filter already exists"), errors.TypeAlreadyExists) {
			err := tx.Commit()
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// Commit the transaction
	return tx.Commit()
}

func (m *createQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
