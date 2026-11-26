package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type deleteOrphanSARoles struct{}

type serviceAccount139 struct {
	bun.BaseModel `bun:"table:service_account"`

	ID     string `bun:"id,pk"`
	Status string `bun:"status"`
}

type serviceAccountRole139 struct {
	bun.BaseModel `bun:"table:service_account_role"`

	ServiceAccountID string `bun:"service_account_id"`
}

func NewDeleteOrphanSARolesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("delete_orphan_sa_roles"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &deleteOrphanSARoles{}, nil
		},
	)
}

func (migration *deleteOrphanSARoles) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *deleteOrphanSARoles) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var deletedServiceAccountIDs []string
	err = tx.NewSelect().
		Model(new(serviceAccount139)).
		Column("id").
		Where("status = ?", "deleted").
		Scan(ctx, &deletedServiceAccountIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if len(deletedServiceAccountIDs) > 0 {
		_, err = tx.NewDelete().
			Model(new(serviceAccountRole139)).
			Where("service_account_id IN (?)", bun.In(deletedServiceAccountIDs)).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *deleteOrphanSARoles) Down(context.Context, *bun.DB) error {
	return nil
}
