package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
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
	return &updateIntegrations{store: store}, nil
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
	OrgID       string    `json:"org_id" bun:"org_id,type:text,unique:org_id_type"`
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
	bun.BaseModel `bun:"table:cloud_integrations_service_configs,alias:c1"`

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
	CloudIntegrationID string `bun:"cloud_integration_id,type:text,notnull,unique:cloud_integration_id_type"`
}

type StorablePersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_token"`
	types.Identifiable
	types.TimeAuditable
	OrgID           string `json:"orgId" bun:"org_id,type:text,notnull"`
	Role            string `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	UserID          string `json:"userId" bun:"user_id,type:text,notnull"`
	Token           string `json:"token" bun:"token,type:text,notnull,unique"`
	Name            string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt       int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed        int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked         bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UpdatedByUserID string `json:"updatedByUserId" bun:"updated_by_user_id,type:text,notnull,default:''"`
}

func (migration *updateIntegrations) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// don't run the migration if there are multiple org ids
	orgIDs := make([]string, 0)
	err = migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs)
	if err != nil {
		return err
	}
	if len(orgIDs) > 1 {
		return nil
	}

	// installed integrations
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingInstalledIntegration), new(newInstalledIntegration), []string{OrgReference}, func(ctx context.Context) error {
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
					CopyOldIntegrationsToNewIntegrations(tx, orgIDs[0], existingIntegrations)
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

	// cloud integrations
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingCloudIntegration), new(newCloudIntegration), []string{OrgReference}, func(ctx context.Context) error {
			existingIntegrations := make([]*existingCloudIntegration, 0)
			err = tx.
				NewSelect().
				Model(&existingIntegrations).
				Where("removed_at IS NULL"). // we will only copy the accounts that are not removed
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingIntegrations) > 0 {
				newIntegrations := migration.
					CopyOldCloudIntegrationsToNewCloudIntegrations(tx, orgIDs[0], existingIntegrations)
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

	// cloud integration service
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingCloudIntegrationService), new(newCloudIntegrationService), []string{CloudIntegrationReference}, func(ctx context.Context) error {
			existingServices := make([]*existingCloudIntegrationService, 0)

			// only one service per provider,account id and type
			// so there won't be any duplicates.
			// just that these will be enabled as soon as the integration for the account is enabled
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
					CopyOldCloudIntegrationServicesToNewCloudIntegrationServices(tx, orgIDs[0], existingServices)
				if len(newServices) > 0 {
					_, err = tx.
						NewInsert().
						Model(&newServices).
						Exec(ctx)
					if err != nil {
						return err
					}
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

func (migration *updateIntegrations) CopyOldIntegrationsToNewIntegrations(tx bun.IDB, orgID string, existingIntegrations []*existingInstalledIntegration) []*newInstalledIntegration {
	newIntegrations := make([]*newInstalledIntegration, 0)

	for _, integration := range existingIntegrations {
		newIntegrations = append(newIntegrations, &newInstalledIntegration{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Type:        integration.IntegrationID,
			Config:      integration.ConfigJSON,
			InstalledAt: integration.InstalledAt,
			OrgID:       orgID,
		})
	}

	return newIntegrations
}

func (migration *updateIntegrations) CopyOldCloudIntegrationsToNewCloudIntegrations(tx bun.IDB, orgID string, existingIntegrations []*existingCloudIntegration) []*newCloudIntegration {
	newIntegrations := make([]*newCloudIntegration, 0)

	for _, integration := range existingIntegrations {
		newIntegrations = append(newIntegrations, &newCloudIntegration{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: integration.CreatedAt,
				UpdatedAt: integration.CreatedAt,
			},
			Provider:        integration.CloudProvider,
			AccountID:       integration.CloudAccountID,
			Config:          integration.ConfigJSON,
			LastAgentReport: integration.LastAgentReportJSON,
			RemovedAt:       integration.RemovedAt,
			OrgID:           orgID,
		})
	}

	return newIntegrations
}

func (migration *updateIntegrations) CopyOldCloudIntegrationServicesToNewCloudIntegrationServices(tx bun.IDB, orgID string, existingServices []*existingCloudIntegrationService) []*newCloudIntegrationService {
	newServices := make([]*newCloudIntegrationService, 0)

	for _, service := range existingServices {
		var cloudIntegrationID string
		err := tx.NewSelect().
			Model((*newCloudIntegration)(nil)).
			Column("id").
			Where("account_id = ?", service.CloudAccountID).
			Where("provider = ?", service.CloudProvider).
			Where("org_id = ?", orgID).
			Scan(context.Background(), &cloudIntegrationID)
		if err != nil {
			if err == sql.ErrNoRows {
				continue
			}
			return nil
		}
		newServices = append(newServices, &newCloudIntegrationService{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: service.CreatedAt,
				UpdatedAt: service.CreatedAt,
			},
			Type:               service.ServiceID,
			Config:             service.ConfigJSON,
			CloudIntegrationID: cloudIntegrationID,
		})
	}

	return newServices
}

func (migration *updateIntegrations) copyOldAwsIntegrationUser(tx bun.IDB, orgID string) error {
	type oldUser struct {
		bun.BaseModel `bun:"table:users"`

		types.TimeAuditable
		ID                string `bun:"id,pk,type:text" json:"id"`
		Name              string `bun:"name,type:text,notnull" json:"name"`
		Email             string `bun:"email,type:text,notnull,unique" json:"email"`
		Password          string `bun:"password,type:text,notnull" json:"-"`
		ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
		GroupID           string `bun:"group_id,type:text,notnull" json:"groupId"`
		OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
	}

	user := &oldUser{}
	err := tx.NewSelect().Model(user).Where("email = ?", "aws-integration@signoz.io").Scan(context.Background())
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	// check if the id is already an uuid
	if _, err := uuid.Parse(user.ID); err == nil {
		return nil
	}

	// new user
	newUser := &oldUser{
		ID: uuid.New().String(),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		OrgID:    orgID,
		Name:     user.Name,
		Email:    user.Email,
		GroupID:  user.GroupID,
		Password: user.Password,
	}

	// get the pat for old user
	pat := &StorablePersonalAccessToken{}
	err = tx.NewSelect().Model(pat).Where("user_id = ? and revoked = false", "aws-integration").Scan(context.Background())
	if err != nil {
		if err == sql.ErrNoRows {
			// delete the old user
			_, err = tx.ExecContext(context.Background(), `DELETE FROM users WHERE id = ?`, user.ID)
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// new pat
	newPAT := &StorablePersonalAccessToken{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		OrgID:     orgID,
		UserID:    newUser.ID,
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

	// insert the new pat
	_, err = tx.NewInsert().Model(newPAT).Exec(context.Background())
	if err != nil {
		return err
	}

	return nil
}
