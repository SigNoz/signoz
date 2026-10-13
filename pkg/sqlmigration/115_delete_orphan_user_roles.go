package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type deleteOrphanUserRoles struct{}

func NewDeleteOrphanUserRolesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("delete_orphan_user_roles"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &deleteOrphanUserRoles{}, nil
		},
	)
}

func (migration *deleteOrphanUserRoles) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *deleteOrphanUserRoles) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var deletedUserIDs []string
	err = tx.NewSelect().
		Model(new(types.User)).
		Column("id").
		Where("status = ?", types.UserStatusDeleted).
		Scan(ctx, &deletedUserIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if len(deletedUserIDs) == 0 {
		return tx.Commit()
	}

	_, err = tx.NewDelete().
		Model(new(authtypes.UserRole)).
		Where("user_id IN (?)", bun.In(deletedUserIDs)).
		Exec(ctx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *deleteOrphanUserRoles) Down(context.Context, *bun.DB) error {
	return nil
}
