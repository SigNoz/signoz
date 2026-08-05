package sqlmigration

import (
	"context"
	"database/sql"
	"time"

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

type role struct {
	bun.BaseModel `bun:"table:role"`

	ID          valuer.UUID `bun:"id,pk,type:text"`
	CreatedAt   time.Time   `bun:"created_at"`
	UpdatedAt   time.Time   `bun:"updated_at"`
	Name        string      `bun:"name,type:string"`
	Description string      `bun:"description,type:string"`
	Type        string      `bun:"type,type:string"`
	OrgID       valuer.UUID `bun:"org_id,type:string"`
}

func newManagedRole(name, description string, orgID valuer.UUID) *role {
	return &role{
		ID:          valuer.GenerateUUID(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Name:        name,
		Description: description,
		Type:        authtypes.RoleTypeManaged.StringValue(),
		OrgID:       orgID,
	}
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

	managedRoles := []*role{}
	for _, orgIDStr := range orgIDs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return err
		}

		managedRoles = append(managedRoles,
			newManagedRole(authtypes.SigNozAdminRoleName, authtypes.SigNozAdminRoleDescription, orgID),
			newManagedRole(authtypes.SigNozEditorRoleName, authtypes.SigNozEditorRoleDescription, orgID),
			newManagedRole(authtypes.SigNozViewerRoleName, authtypes.SigNozViewerRoleDescription, orgID),
			newManagedRole(authtypes.SigNozAnonymousRoleName, authtypes.SigNozAnonymousRoleDescription, orgID),
		)
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
