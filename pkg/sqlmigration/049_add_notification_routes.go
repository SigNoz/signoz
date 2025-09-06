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

type addNotificationRoutes struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddNotificationRoutesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_notification_routes"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddNotificationRoutes(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddNotificationRoutes(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addNotificationRoutes{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addNotificationRoutes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addNotificationRoutes) Up(ctx context.Context, db *bun.DB) error {
	type identifiable struct {
		ID valuer.UUID `json:"id" bun:"id,pk,type:text"`
	}

	type timeAuditable struct {
		CreatedAt time.Time `bun:"created_at" json:"createdAt"`
		UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
	}

	type userAuditable struct {
		CreatedBy string `bun:"created_by,type:text" json:"createdBy"`
		UpdatedBy string `bun:"updated_by,type:text" json:"updatedBy"`
	}

	type expressionRoute struct {
		bun.BaseModel `bun:"table:notification_routes"`
		identifiable
		timeAuditable
		userAuditable

		// Core routing fields
		Expression string `bun:"expression,type:text,notnull" json:"expression"`

		// Action configuration (stored as JSON)
		Channels []string `bun:"channels,type:jsonb" json:"channels"`
		Priority string   `bun:"priority,type:text" json:"priority"`

		// Extensibility fields
		Name        string   `bun:"name,type:text" json:"name"`
		Description string   `bun:"description,type:text" json:"description"`
		Enabled     bool     `bun:"enabled,type:boolean,default:true" json:"enabled"`
		Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`

		// Organization/tenant isolation
		OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
	}

	// Create the notification_routes table
	_, err := db.NewCreateTable().
		Model((*expressionRoute)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	// Create indexes for better performance
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_id ON notification_routes (org_id)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_enabled ON notification_routes (enabled)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_enabled ON notification_routes (org_id, enabled)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_created_at ON notification_routes (created_at)",
	}

	for _, indexSQL := range indexes {
		_, err := db.ExecContext(ctx, indexSQL)
		if err != nil {
			return err
		}
	}

	return nil
}

func (migration *addNotificationRoutes) Down(ctx context.Context, db *bun.DB) error {
	// Drop the table if it exists
	_, err := db.NewDropTable().
		Table("notification_routes").
		IfExists().
		Exec(ctx)
	return err
}
