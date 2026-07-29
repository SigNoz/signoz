package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateRoleTransactionGroups struct{}

func NewUpdateRoleTransactionGroupsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("update_role_transaction_groups"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &updateRoleTransactionGroups{}, nil
		},
	)
}

func (migration *updateRoleTransactionGroups) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *updateRoleTransactionGroups) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	managedRoleGroups := make(map[string]string, len(coretypes.ManagedRoleToTransactions))
	for roleName, transactions := range coretypes.ManagedRoleToTransactions {
		data, err := json.Marshal(authtypes.NewTransactionGroupsFromTransactions(transactions))
		if err != nil {
			return err
		}
		managedRoleGroups[roleName] = string(data)
	}

	for _, orgID := range orgIDs {
		for roleName, data := range managedRoleGroups {
			if _, err := tx.NewUpdate().
				Model(new(roles)).
				Set("transaction_groups = ?", data).
				Where("org_id = ?", orgID).
				Where("type = ?", authtypes.RoleTypeManaged.StringValue()).
				Where("name = ?", roleName).
				Exec(ctx); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (migration *updateRoleTransactionGroups) Down(context.Context, *bun.DB) error {
	return nil
}
