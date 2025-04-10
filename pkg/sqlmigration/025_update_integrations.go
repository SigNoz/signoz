package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	eeTypes "github.com/SigNoz/signoz/ee/types"
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
	Config      string    `json:"config" bun:"config,type:text"`
	InstalledAt time.Time `json:"installed_at" bun:"installed_at,default:current_timestamp"`
	OrgID       string    `json:"org_id" bun:"org_id,type:text,unique:org_id_type,references:organizations(id),on_delete:cascade"`
}

type existingCloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integrations_accounts"`

	CloudProvider       string     `bun:"cloud_provider,type:text,unique:cloud_provider_id"`
	ID                  string     `bun:"id,type:text,notnull,unique:cloud_provider_id"`
	ConfigJSON          string     `bun:"config_json,type:text"`
	CloudAccountID      string     `bun:"cloud_account_id,type:text"`
	LastAgentReportJSON string     `bun:"last_agent_report_json,type:text"`
	CreatedAt           time.Time  `bun:"created_at,notnull,default:current_timestamp"`
	RemovedAt           *time.Time `bun:"removed_at,type:timestamp"`
}

type newCloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	types.Identifiable
	types.TimeAuditable
	Provider        string     `json:"provider" bun:"provider,type:text"`
	Config          string     `json:"config" bun:"config,type:text"`
	AccountID       string     `json:"account_id" bun:"account_id,type:text"`
	LastAgentReport string     `json:"last_agent_report" bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time `json:"removed_at" bun:"removed_at,type:timestamp"`
	OrgID           string     `json:"org_id" bun:"org_id,type:text"`
}

type existingCloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integrations_service_configs"`

	CloudProvider  string    `bun:"cloud_provider,type:text,notnull,unique:service_cloud_provider_account"`
	CloudAccountID string    `bun:"cloud_account_id,type:text,notnull,unique:service_cloud_provider_account"`
	ServiceID      string    `bun:"service_id,type:text,notnull,unique:service_cloud_provider_account"`
	ConfigJSON     string    `bun:"config_json,type:text"`
	CreatedAt      time.Time `bun:"created_at,default:current_timestamp"`
}

type newCloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`

	types.Identifiable
	types.TimeAuditable
	Type               string `bun:"type,type:text,notnull,unique:cloud_integration_id_type"`
	Config             string `bun:"config,type:text"`
	CloudIntegrationID string `bun:"cloud_integration_id,type:text,notnull,unique:cloud_integration_id_type,references:cloud_integrations(id),on_delete:cascade"`
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

	// ---
	// installed integrations
	// ---
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingInstalledIntegration), new(newInstalledIntegration), []string{}, func(ctx context.Context) error {
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
					CopyOldIntegrationsToNewIntegrations(tx, existingIntegrations)
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

	// ---
	// cloud integrations
	// ---
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingCloudIntegration), new(newCloudIntegration), []string{}, func(ctx context.Context) error {
			existingIntegrations := make([]*existingCloudIntegration, 0)
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
					CopyOldCloudIntegrationsToNewCloudIntegrations(tx, existingIntegrations)
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

	// add unique constraint to cloud_integration table
	_, err = tx.ExecContext(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS unique_cloud_integration ON cloud_integration (id, provider, org_id)`)
	if err != nil {
		return err
	}

	// ---
	// cloud integration service
	// ---
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingCloudIntegrationService), new(newCloudIntegrationService), []string{}, func(ctx context.Context) error {
			existingServices := make([]*existingCloudIntegrationService, 0)
			err = tx.
				NewSelect().
				Model(&existingServices).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingServices) > 0 {
				newServices := migration.
					CopyOldCloudIntegrationServicesToNewCloudIntegrationServices(tx, existingServices)
				_, err = tx.
					NewInsert().
					Model(&newServices).
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

	if len(orgIDs) == 0 {
		err = tx.Commit()
		if err != nil {
			return err
		}
		return nil
	}

	// copy the old aws integration user to the new user
	err = migration.copyOldAwsIntegrationUser(tx, orgIDs[0])
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

func (migration *updateIntegrations) CopyOldIntegrationsToNewIntegrations(tx bun.IDB, existingIntegrations []*existingInstalledIntegration) []*newInstalledIntegration {
	newIntegrations := make([]*newInstalledIntegration, 0)
	// get the first org id
	orgIDs := make([]string, 0)
	err := tx.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(context.Background(), &orgIDs)
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
			Config:      integration.ConfigJSON,
			InstalledAt: integration.InstalledAt,
			OrgID:       orgIDs[0],
		})
	}

	return newIntegrations
}

func (migration *updateIntegrations) CopyOldCloudIntegrationsToNewCloudIntegrations(tx bun.IDB, existingIntegrations []*existingCloudIntegration) []*newCloudIntegration {
	newIntegrations := make([]*newCloudIntegration, 0)
	// get the first org id
	orgIDs := make([]string, 0)
	err := tx.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(context.Background(), &orgIDs)
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
		newIntegrations = append(newIntegrations, &newCloudIntegration{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: integration.CreatedAt,
			},
			Provider:        integration.CloudProvider,
			AccountID:       integration.CloudAccountID,
			Config:          integration.ConfigJSON,
			LastAgentReport: integration.LastAgentReportJSON,
			RemovedAt:       integration.RemovedAt,
			OrgID:           orgIDs[0],
		})
	}

	return newIntegrations
}

func (migration *updateIntegrations) CopyOldCloudIntegrationServicesToNewCloudIntegrationServices(tx bun.IDB, existingServices []*existingCloudIntegrationService) []*newCloudIntegrationService {
	newServices := make([]*newCloudIntegrationService, 0)
	// get the first org id
	orgIDs := make([]string, 0)
	err := tx.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(context.Background(), &orgIDs)
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

	for _, service := range existingServices {
		var cloudIntegrationID string
		err := tx.NewSelect().
			Model((*newCloudIntegration)(nil)).
			Column("id").
			Where("account_id = ?", service.CloudAccountID).
			Where("provider = ?", service.CloudProvider).
			Where("org_id = ?", orgIDs[0]).
			Scan(context.Background(), &cloudIntegrationID)
		if err != nil {
			if err == sql.ErrNoRows {
				continue
			}
			zap.L().Error("failed to get cloud integration id", zap.Error(err))
			return nil
		}
		newServices = append(newServices, &newCloudIntegrationService{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: service.CreatedAt,
			},
			Type:               service.ServiceID,
			Config:             service.ConfigJSON,
			CloudIntegrationID: cloudIntegrationID,
		})
	}

	return newServices
}

// we are making sure that new uuid v7 is added to the user
// and the pat is connected to the new user.
func (migration *updateIntegrations) copyOldAwsIntegrationUser(tx bun.IDB, orgID string) error {
	type OldUser struct {
		bun.BaseModel `bun:"table:users"`

		types.TimeAuditable
		ID                string `bun:"id,pk,type:text"`
		Name              string `bun:"name,type:text,notnull" json:"name"`
		Email             string `bun:"email,type:text,notnull,unique" json:"email"`
		Password          string `bun:"password,type:text,notnull" json:"-"`
		ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
		GroupID           string `bun:"group_id,type:text,notnull" json:"groupId"`
		OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
	}

	user := &OldUser{}
	err := tx.NewSelect().Model(user).Where("email = ?", "aws-integration@signoz.io").Scan(context.Background())
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	// create a new user
	newUser := &types.User{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
		},
		OrgID:    orgID,
		Name:     user.Name,
		Email:    user.Email,
		GroupID:  user.GroupID,
		Password: user.Password,
	}

	// get the pat for the user
	pat := &eeTypes.StorablePersonalAccessToken{}
	err = tx.NewSelect().Model(pat).Where("user_id = ? and revoked = false", "aws-integration").Scan(context.Background())
	if err != nil {
		return err
	}

	// create a new pat
	newPAT := &eeTypes.StorablePersonalAccessToken{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
		},
		OrgID:     orgID,
		UserID:    newUser.ID.String(),
		Token:     pat.Token,
		Name:      pat.Name,
		ExpiresAt: pat.ExpiresAt,
		LastUsed:  pat.LastUsed,
		Revoked:   pat.Revoked,
		Role:      pat.Role,
	}

	// delete old user
	_, err = tx.ExecContext(context.Background(), `DELETE FROM users WHERE id = ?`, user.ID)
	if err != nil {
		return err
	}

	// insert the new user
	_, err = tx.NewInsert().Model(newUser).Exec(context.Background())
	if err != nil {
		return err
	}

	// delete the old pat
	_, err = tx.ExecContext(context.Background(), `DELETE FROM personal_access_token WHERE id = ?`, pat.ID)
	if err != nil {
		return err
	}

	// insert the new pat
	_, err = tx.NewInsert().Model(newPAT).Exec(context.Background())
	if err != nil {
		return err
	}

	return nil
}
