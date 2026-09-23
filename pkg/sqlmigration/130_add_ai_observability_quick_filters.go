package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type storableAIObservabilityQuickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`

	ID        valuer.UUID `bun:"id,pk,type:text"`
	OrgID     string      `bun:"org_id,type:text,notnull"`
	Filter    string      `bun:"filter,type:text,notnull"`
	Source    string      `bun:"source,type:text,notnull"`
	CreatedAt time.Time   `bun:"created_at"`
	UpdatedAt time.Time   `bun:"updated_at"`
}

type addAIObservabilityQuickFilters struct{}

func NewAddAIObservabilityQuickFiltersFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_ai_o11y_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addAIObservabilityQuickFilters{}, nil
	})
}

func (migration *addAIObservabilityQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addAIObservabilityQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	filters := []telemetryFieldKeyOutput{
		{Name: "deployment.environment", FieldContext: "resource", FieldDataType: "string"},
		{Name: "gen_ai.operation.name", FieldContext: "attribute", FieldDataType: "string"},
		{Name: "gen_ai.provider.name", FieldContext: "attribute", FieldDataType: "string"},
		{Name: "gen_ai.request.model", FieldContext: "attribute", FieldDataType: "string"},
		{Name: "service.name", FieldContext: "resource", FieldDataType: "string"},
		{Name: "gen_ai.tool.name", FieldContext: "attribute", FieldDataType: "string"},
		{Name: "gen_ai.agent.name", FieldContext: "attribute", FieldDataType: "string"},
	}

	filterJSON, err := marshalUnescaped(filters)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var orgIDs []string
	if err := tx.NewSelect().Table("organizations").Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	if len(orgIDs) == 0 {
		return tx.Commit()
	}

	now := time.Now()
	rows := make([]*storableAIObservabilityQuickFilter, 0, len(orgIDs))
	for _, orgID := range orgIDs {
		rows = append(rows, &storableAIObservabilityQuickFilter{
			ID:        valuer.GenerateUUID(),
			OrgID:     orgID,
			Filter:    string(filterJSON),
			Source:    "ai_observability",
			CreatedAt: now,
			UpdatedAt: now,
		})
	}

	if _, err := tx.NewInsert().Model(&rows).On("CONFLICT (org_id, source) DO NOTHING").Exec(ctx); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *addAIObservabilityQuickFilters) Down(context.Context, *bun.DB) error {
	return nil
}
