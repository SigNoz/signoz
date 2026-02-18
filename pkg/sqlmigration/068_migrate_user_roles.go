package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/identitytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// Role name mapping from existing roles to managed role names
var existingRoleToManagedRole = map[string]string{
	"ADMIN":  "signoz-admin",
	"EDITOR": "signoz-editor",
	"VIEWER": "signoz-viewer",
}

type migrateUserRoles struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewMigrateUserRolesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_user_roles"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return &migrateUserRoles{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *migrateUserRoles) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *migrateUserRoles) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	type existingUser struct {
		bun.BaseModel `bun:"table:users"`
		ID            string `bun:"id"`
		Role          string `bun:"role"`
	}
	var users []*existingUser
	if err := tx.NewSelect().Model(&users).Scan(ctx); err != nil {
		return err
	}

	identityRoles := make([]*identitytypes.StorableIdentityRole, 0, len(users))
	for _, user := range users {
		roleName := existingRoleToManagedRole[user.Role]
		identityID, err := valuer.NewUUID(user.ID)
		if err != nil {
			return err
		}
		identityRoles = append(identityRoles, identitytypes.NewStorableIdentityRole(
			identityID,
			roleName,
		))
	}

	if len(identityRoles) > 0 {
		if _, err := tx.NewInsert().Model(&identityRoles).Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *migrateUserRoles) Down(context.Context, *bun.DB) error {
	return nil
}
