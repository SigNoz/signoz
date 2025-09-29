package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// Shared types for migration
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

	Expression     string `bun:"expression,type:text,notnull" json:"expression"`
	ExpressionKind string `bun:"kind,type:text" json:"kind"`

	Channels []string `bun:"channels,type:jsonb" json:"channels"`

	Name        string   `bun:"name,type:text" json:"name"`
	Description string   `bun:"description,type:text" json:"description"`
	Enabled     bool     `bun:"enabled,type:boolean,default:true" json:"enabled"`
	Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`

	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
}

type rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

type addNotificationRoutes struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
	logger    *slog.Logger
}

func NewAddNotificationRoutesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_notification_routes"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddNotificationRoutes(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddNotificationRoutes(_ context.Context, settings factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addNotificationRoutes{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
		logger:    settings.Logger,
	}, nil
}

func (migration *addNotificationRoutes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addNotificationRoutes) Up(ctx context.Context, db *bun.DB) error {
	// Create the notification_routes table
	_, err := db.NewCreateTable().
		Model((*expressionRoute)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_id ON notification_routes (org_id)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_enabled ON notification_routes (enabled)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_enabled ON notification_routes (org_id, enabled)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_kind ON notification_routes (kind)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_kind ON notification_routes (org_id, kind)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_name ON notification_routes (name)",
		"CREATE INDEX IF NOT EXISTS idx_notification_routes_org_route_name ON notification_routes (org_id, name)",
	}

	for _, indexSQL := range indexes {
		_, err := db.ExecContext(ctx, indexSQL)
		if err != nil {
			return err
		}
	}

	err = migration.migrateRulesToNotificationRoutes(ctx, db)
	if err != nil {
		return err
	}

	return nil
}

func (migration *addNotificationRoutes) migrateRulesToNotificationRoutes(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var rules []*rule
	err = tx.NewSelect().
		Model(&rules).
		Where("deleted = ?", 0).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil // No rules to migrate
		}
		return errors.NewInternalf(errors.CodeInternal, "failed to fetch rules")
	}

	if len(rules) == 0 {
		if err := tx.Commit(); err != nil {
			return err
		}
		return nil
	}

	channelsByOrg, err := migration.getAllChannelsInTx(ctx, tx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "fetching channels error: %v", err)
	}

	var routesToInsert []*expressionRoute

	for _, r := range rules {
		existingRouteCount, err := tx.NewSelect().
			Model((*expressionRoute)(nil)).
			Where("name = ? AND kind = ? AND org_id = ?", r.ID.StringValue(), "rule", r.OrgID).
			Count(ctx)
		if err != nil {
			return errors.NewInternalf(errors.CodeInternal, "failed to check existing route for rule %s", r.ID.StringValue())
		}

		if existingRouteCount > 0 {
			continue
		}

		routeList, err := migration.convertRulesToRoutes([]*rule{r}, channelsByOrg)
		if err != nil {
			return errors.NewInternalf(errors.CodeInternal, "converting rules to routes error: %v", err)
		}
		if len(routeList) > 0 {
			routesToInsert = append(routesToInsert, routeList...)
		}
	}

	// Insert all routes in a single batch operation
	if len(routesToInsert) > 0 {
		_, err = tx.NewInsert().
			Model(&routesToInsert).
			Exec(ctx)
		if err != nil {
			return errors.NewInternalf(errors.CodeInternal, "failed to insert notification routes")
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addNotificationRoutes) convertRulesToRoutes(rules []*rule, channelsByOrg map[string][]string) ([]*expressionRoute, error) {
	var routes []*expressionRoute
	var errorList []error
	for _, r := range rules {
		var gettableRule ruletypes.GettableRule
		if err := json.Unmarshal([]byte(r.Data), &gettableRule); err != nil {
			errorList = append(errorList, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal gettableRule for rule %s : error : %v", r.ID.StringValue(), err))
			continue
		}

		if len(gettableRule.PreferredChannels) == 0 {
			channels, exists := channelsByOrg[r.OrgID]
			if !exists || len(channels) == 0 {
				continue
			}
			gettableRule.PreferredChannels = channels
		}
		severity := "critical"
		if v, ok := gettableRule.Labels["severity"]; ok {
			severity = v
		}
		expression := fmt.Sprintf(`%s == "%s" && %s == "%s"`, "threshold.name", severity, "ruleId", r.ID.String())
		route := &expressionRoute{
			identifiable: identifiable{
				ID: valuer.GenerateUUID(),
			},
			timeAuditable: timeAuditable{
				CreatedAt: r.CreatedAt,
				UpdatedAt: r.UpdatedAt,
			},
			userAuditable: userAuditable{
				CreatedBy: r.CreatedBy,
				UpdatedBy: r.UpdatedBy,
			},
			Expression:     expression,
			ExpressionKind: "rule",
			Channels:       gettableRule.PreferredChannels,
			Name:           r.ID.StringValue(),
			Description:    "",
			Enabled:        !gettableRule.Disabled,
			Tags:           []string{},
			OrgID:          r.OrgID,
		}
		routes = append(routes, route)
	}
	if len(errorList) > 0 {
		return nil, errors.Join(errorList...)
	}
	return routes, nil
}

func (migration *addNotificationRoutes) getAllChannelsInTx(ctx context.Context, tx bun.Tx) (map[string][]string, error) {
	type channel struct {
		bun.BaseModel `bun:"table:notification_channel"`
		types.Identifiable
		types.TimeAuditable
		Name  string `json:"name" bun:"name"`
		Type  string `json:"type" bun:"type"`
		Data  string `json:"data" bun:"data"`
		OrgID string `json:"org_id" bun:"org_id"`
	}

	var channels []*channel
	err := tx.NewSelect().
		Model(&channels).
		Scan(ctx)
	if err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "failed to fetch all channels")
	}

	// Group channels by org ID
	channelsByOrg := make(map[string][]string)
	for _, ch := range channels {
		channelsByOrg[ch.OrgID] = append(channelsByOrg[ch.OrgID], ch.Name)
	}

	return channelsByOrg, nil
}

func (migration *addNotificationRoutes) Down(ctx context.Context, db *bun.DB) error {
	// Drop the table if it exists
	_, err := db.NewDropTable().
		Table("notification_routes").
		IfExists().
		Exec(ctx)
	return err
}
