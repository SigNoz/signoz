package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addManagedRoles struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddManagedRolesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_managed_roles"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddManagedRoles(ctx, ps, c, sqlstore, sqlschema)
	})
}

func newAddManagedRoles(_ context.Context, _ factory.ProviderSettings, _ Config, sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addManagedRoles{sqlstore: sqlStore, sqlschema: sqlSchema}, nil
}

func (migration *addManagedRoles) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addManagedRoles) Up(ctx context.Context, db *bun.DB) error {
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

	managedRoles := []*authtypes.Role{}
	for _, orgIDStr := range orgIDs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return err
		}

		// signoz admin
		signozAdminRole := authtypes.NewRole(authtypes.SigNozAdminRoleName, authtypes.SigNozAdminRoleDescription, authtypes.RoleTypeManaged, orgID)
		managedRoles = append(managedRoles, signozAdminRole)

		// signoz editor
		signozEditorRole := authtypes.NewRole(authtypes.SigNozEditorRoleName, authtypes.SigNozEditorRoleDescription, authtypes.RoleTypeManaged, orgID)
		managedRoles = append(managedRoles, signozEditorRole)

		// signoz viewer
		signozViewerRole := authtypes.NewRole(authtypes.SigNozViewerRoleName, authtypes.SigNozViewerRoleDescription, authtypes.RoleTypeManaged, orgID)
		managedRoles = append(managedRoles, signozViewerRole)

		// signoz anonymous
		signozAnonymousRole := authtypes.NewRole(authtypes.SigNozAnonymousRoleName, authtypes.SigNozAnonymousRoleDescription, authtypes.RoleTypeManaged, orgID)
		managedRoles = append(managedRoles, signozAnonymousRole)
	}

	if len(managedRoles) > 0 {
		_, err = tx.NewInsert().
			Model(&managedRoles).
			On("CONFLICT (org_id, name) DO UPDATE").
			Set("description = EXCLUDED.description, type = EXCLUDED.type, updated_at = EXCLUDED.updated_at").
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addManagedRoles) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
