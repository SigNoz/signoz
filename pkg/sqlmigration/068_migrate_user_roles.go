package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
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
	// 1. Disable FK enforcement
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// 2. Fetch existing users with their roles
	type existingUser struct {
		bun.BaseModel `bun:"table:users"`
		ID            string `bun:"id"`
		Role          string `bun:"role"`
	}
	var users []*existingUser
	if err := tx.NewSelect().Model(&users).Scan(ctx); err != nil {
		return err
	}

	// 3. Create identity_role records for each user using role_name directly
	now := time.Now()
	for _, user := range users {
		roleName := existingRoleToManagedRole[user.Role]

		if _, err := tx.NewInsert().
			Table("identity_role").
			Value("id", "?", valuer.GenerateUUID().StringValue()).
			Value("identity_id", "?", user.ID).
			Value("role_name", "?", roleName).
			Value("created_at", "?", now).
			Value("updated_at", "?", now).
			Exec(ctx); err != nil {
			return err
		}
	}

	// 4. Get current table structure
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	// 5. Drop role column
	roleColumn := &sqlschema.Column{Name: "role"}
	dropColumnSQLs := migration.sqlschema.Operator().DropColumn(table, roleColumn)
	for _, sql := range dropColumnSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// 6. Re-enable FK enforcement
	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *migrateUserRoles) Down(context.Context, *bun.DB) error {
	return nil
}
