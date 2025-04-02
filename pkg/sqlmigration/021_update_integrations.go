package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

type updateIntegrations struct {
	store sqlstore.SQLStore
}

func NewUpdateIntegrationsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_integrations"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateIntegrations(ctx, ps, c, sqlstore)
	})
}

func newUpdateIntegrations(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateIntegrations{
		store: store,
	}, nil
}

func (migration *updateIntegrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

type existingInstalledIntegration struct {
	bun.BaseModel `bun:"table:integrations_installed"`

	IntegrationID string    `bun:"integration_id,pk,type:text"`
	ConfigJSON    string    `bun:"config_json,type:text"`
	InstalledAt   time.Time `bun:"installed_at,default:current_timestamp"`
}

type newInstalledIntegration struct {
	bun.BaseModel `bun:"table:installed_integration"`

	types.Identifiable
	Type        string    `json:"type" bun:"type,type:text,unique:org_id_type"`
	ConfigJSON  string    `json:"config_json" bun:"config_json,type:text"`
	InstalledAt time.Time `json:"installed_at" bun:"installed_at,default:current_timestamp"`
	OrgID       string    `json:"org_id" bun:"org_id,type:text,unique:org_id_type,references:organizations(id),on_delete:cascade"`
}

func (migration *updateIntegrations) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// don't run the migration if there are multiple org ids
	orgIDs := make([]string, 0)
	err = migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs)
	if err != nil {
		return err
	}
	if len(orgIDs) > 1 {
		return nil
	}

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingInstalledIntegration), new(newInstalledIntegration), func(ctx context.Context) error {
			existingIntegrations := make([]*existingInstalledIntegration, 0)
			err = tx.
				NewSelect().
				Model(&existingIntegrations).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingIntegrations) > 0 {
				newIntegrations := migration.
					CopyOldIntegrationsToNewIntegrations(existingIntegrations)
				_, err = tx.
					NewInsert().
					Model(&newIntegrations).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateIntegrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *updateIntegrations) CopyOldIntegrationsToNewIntegrations(existingIntegrations []*existingInstalledIntegration) []*newInstalledIntegration {
	newIntegrations := make([]*newInstalledIntegration, 0)
	// get the first org id
	orgIDs := make([]string, 0)
	err := migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(context.Background(), &orgIDs)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		zap.L().Error("failed to get org id", zap.Error(err))
		return nil
	}
	if len(orgIDs) == 0 {
		return nil
	}

	for _, integration := range existingIntegrations {
		newIntegrations = append(newIntegrations, &newInstalledIntegration{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Type:        integration.IntegrationID,
			ConfigJSON:  integration.ConfigJSON,
			InstalledAt: integration.InstalledAt,
			OrgID:       orgIDs[0],
		})
	}

	return newIntegrations
}
