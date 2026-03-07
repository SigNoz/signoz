package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addMeterQuickFilters struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddMeterQuickFiltersFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_meter_quick_filters"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddMeterQuickFilters(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddMeterQuickFilters(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addMeterQuickFilters{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addMeterQuickFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addMeterQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	meterFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "float64", "type": "Sum"},
		{"key": "service.name", "dataType": "float64", "type": "Sum"},
		{"key": "host.name", "dataType": "float64", "type": "Sum"},
	}

	meterJSON, err := json.Marshal(meterFilters)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal meter filters")
	}

	type signal struct {
		valuer.String
	}

	type identifiable struct {
		ID valuer.UUID `json:"id" bun:"id,pk,type:text"`
	}

	type timeAuditable struct {
		CreatedAt time.Time `bun:"created_at" json:"createdAt"`
		UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
	}

	type quickFilterType struct {
		bun.BaseModel `bun:"table:quick_filter"`
		identifiable
		OrgID  valuer.UUID `bun:"org_id,type:text,notnull"`
		Filter string      `bun:"filter,type:text,notnull"`
		Signal signal      `bun:"signal,type:text,notnull"`
		timeAuditable
	}

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

	var meterFiltersToInsert []quickFilterType
	for _, orgIDStr := range orgIDs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return err
		}

		meterFiltersToInsert = append(meterFiltersToInsert, quickFilterType{
			identifiable: identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(meterJSON),
			Signal: signal{valuer.NewString("meter")},
			timeAuditable: timeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		})
	}

	if len(meterFiltersToInsert) > 0 {
		_, err = tx.NewInsert().
			Model(&meterFiltersToInsert).
			On("CONFLICT (org_id, signal) DO UPDATE").
			Set("filter = EXCLUDED.filter, updated_at = EXCLUDED.updated_at").
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

func (migration *addMeterQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
