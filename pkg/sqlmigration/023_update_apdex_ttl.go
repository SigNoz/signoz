package sqlmigration

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateApdexTtl struct {
	store sqlstore.SQLStore
}

type existingApdexSettings struct {
	bun.BaseModel      `bun:"table:apdex_settings"`
	OrgID              string  `bun:"org_id,pk,type:text" json:"orgId"`
	ServiceName        string  `bun:"service_name,pk,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}

type newApdexSettings struct {
	bun.BaseModel `bun:"table:apdex_setting"`
	types.Identifiable
	OrgID              string  `bun:"org_id,type:text" json:"orgId"`
	ServiceName        string  `bun:"service_name,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}

type existingTTLStatus struct {
	bun.BaseModel  `bun:"table:ttl_status"`
	ID             int       `bun:"id,pk,autoincrement"`
	TransactionID  string    `bun:"transaction_id,type:text,notnull"`
	CreatedAt      time.Time `bun:"created_at,type:datetime,notnull"`
	UpdatedAt      time.Time `bun:"updated_at,type:datetime,notnull"`
	TableName      string    `bun:"table_name,type:text,notnull"`
	TTL            int       `bun:"ttl,notnull,default:0"`
	ColdStorageTTL int       `bun:"cold_storage_ttl,notnull,default:0"`
	Status         string    `bun:"status,type:text,notnull"`
}

type newTTLStatus struct {
	bun.BaseModel `bun:"table:ttl_setting"`
	types.Identifiable
	types.TimeAuditable
	TransactionID  string `bun:"transaction_id,type:text,notnull"`
	TableName      string `bun:"table_name,type:text,notnull"`
	TTL            int    `bun:"ttl,notnull,default:0"`
	ColdStorageTTL int    `bun:"cold_storage_ttl,notnull,default:0"`
	Status         string `bun:"status,type:text,notnull"`
	OrgID          string `json:"-" bun:"org_id,notnull"`
}

func NewUpdateApdexTtlFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_apdex_ttl"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateApdexTtl(ctx, ps, c, sqlstore)
	})
}

func newUpdateApdexTtl(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateApdexTtl{store: store}, nil
}

func (migration *updateApdexTtl) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateApdexTtl) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingApdexSettings), new(newApdexSettings), []string{OrgReference}, func(ctx context.Context) error {
			existingApdexSettings := make([]*existingApdexSettings, 0)
			err = tx.
				NewSelect().
				Model(&existingApdexSettings).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingApdexSettings) > 0 {
				newSettings := migration.
					CopyExistingApdexSettingsToNewApdexSettings(existingApdexSettings)
				_, err = tx.
					NewInsert().
					Model(&newSettings).
					Exec(ctx)
				if err != nil {
					return err
				}
			}

			tableName := tx.Dialect().Tables().Get(reflect.TypeOf(new(newApdexSettings))).Name
			_, err = tx.
				ExecContext(ctx, fmt.Sprintf("CREATE UNIQUE INDEX IF NOT EXISTS %s_unique_idx ON %s (service_name, org_id)", tableName, tableName))
			if err != nil {
				return err
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingTTLStatus), new(newTTLStatus), []string{OrgReference}, func(ctx context.Context) error {
			existingTTLStatus := make([]*existingTTLStatus, 0)
			err = tx.
				NewSelect().
				Model(&existingTTLStatus).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingTTLStatus) > 0 {
				var orgID string
				err := migration.
					store.
					BunDB().
					NewSelect().
					Model((*types.Organization)(nil)).
					Column("id").
					Scan(ctx, &orgID)
				if err != nil {
					if err != sql.ErrNoRows {
						return err
					}
				}

				if err == nil {
					newTTLStatus := migration.CopyExistingTTLStatusToNewTTLStatus(existingTTLStatus, orgID)
					_, err = tx.
						NewInsert().
						Model(&newTTLStatus).
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

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateApdexTtl) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateApdexTtl) CopyExistingApdexSettingsToNewApdexSettings(existingApdexSettings []*existingApdexSettings) []*newApdexSettings {
	newSettings := make([]*newApdexSettings, 0)
	for _, apdexSetting := range existingApdexSettings {
		newSettings = append(newSettings, &newApdexSettings{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			ServiceName:        apdexSetting.ServiceName,
			Threshold:          apdexSetting.Threshold,
			ExcludeStatusCodes: apdexSetting.ExcludeStatusCodes,
			OrgID:              apdexSetting.OrgID,
		})
	}

	return newSettings
}

func (migration *updateApdexTtl) CopyExistingTTLStatusToNewTTLStatus(existingTTLStatus []*existingTTLStatus, orgID string) []*newTTLStatus {
	newTTLStatuses := make([]*newTTLStatus, 0)

	for _, ttl := range existingTTLStatus {
		newTTLStatuses = append(newTTLStatuses, &newTTLStatus{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: ttl.CreatedAt,
				UpdatedAt: ttl.UpdatedAt,
			},
			TransactionID:  ttl.TransactionID,
			TTL:            ttl.TTL,
			TableName:      ttl.TableName,
			ColdStorageTTL: ttl.ColdStorageTTL,
			Status:         ttl.Status,
			OrgID:          orgID,
		})
	}

	return newTTLStatuses
}
