package sqlmigration

import (
	"context"
	"database/sql"
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

func NewCreateQuickFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &createQuickFilters{store: store}, nil
	})
}

func (m *createQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *createQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.
		BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

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
			tx.Commit()
			return nil
		}
		return err
	}
	storableQuickFilters := quickfiltertypes.NewDefaultQuickFilter(defaultOrg)

	// Insert all filters in a single transaction
	_, err = tx.NewInsert().Model(&storableQuickFilters).Exec(ctx)
	return err
}

func (m *createQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
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
