package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addAiObservabilityQuickFilters struct {
	sqlstore sqlstore.SQLStore
}

func NewAddAiObservabilityQuickFiltersFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_ai_observability_filters"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return &addAiObservabilityQuickFilters{sqlstore: sqlstore}, nil
	})
}

func (migration *addAiObservabilityQuickFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAiObservabilityQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	// keep in sync with the ai_observability defaults in quickfiltertypes.NewDefaultQuickFilter
	aiObservabilityFilters := []map[string]interface{}{
		{"key": telemetrytypes.GenAIRequestModel, "dataType": "string", "type": "tag"},
		{"key": telemetrytypes.GenAIProviderName, "dataType": "string", "type": "tag"},
		{"key": telemetrytypes.GenAIToolName, "dataType": "string", "type": "tag"},
		{"key": telemetrytypes.GenAIAgentName, "dataType": "string", "type": "tag"},
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "hasError", "dataType": "bool", "type": "tag"},
	}

	aiObservabilityJSON, err := json.Marshal(aiObservabilityFilters)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal ai monitoring filters")
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

	var filtersToInsert []quickFilterType
	for _, orgIDStr := range orgIDs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return err
		}

		filtersToInsert = append(filtersToInsert, quickFilterType{
			identifiable: identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(aiObservabilityJSON),
			Signal: signal{valuer.NewString("ai_observability")},
			timeAuditable: timeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		})
	}

	if len(filtersToInsert) > 0 {
		_, err = tx.NewInsert().
			Model(&filtersToInsert).
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

func (migration *addAiObservabilityQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
