package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"log/slog"
	"time"
)

// Shared types for migration

type expressionRoute struct {
	bun.BaseModel `bun:"table:route_policy"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	Expression     string `bun:"expression,type:text"`
	ExpressionKind string `bun:"kind,type:text"`

	Channels []string `bun:"channels,type:text"`

	Name        string   `bun:"name,type:text"`
	Description string   `bun:"description,type:text"`
	Enabled     bool     `bun:"enabled,type:boolean,default:true"`
	Tags        []string `bun:"tags,type:text"`

	OrgID string `bun:"org_id,type:text"`
}

type rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,default:0"`
	Data    string `bun:"data,type:text"`
	OrgID   string `bun:"org_id,type:text"`
}

type addRoutePolicies struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
	logger    *slog.Logger
}

func NewAddRoutePolicyFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_route_policy"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddRoutePolicy(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddRoutePolicy(_ context.Context, settings factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addRoutePolicies{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
		logger:    settings.Logger,
	}, nil
}

func (migration *addRoutePolicies) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addRoutePolicies) Up(ctx context.Context, db *bun.DB) error {
	_, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("route_policy"))
	if err == nil {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	// Create the route_policy table
	table := &sqlschema.Table{
		Name: "route_policy",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "expression", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "channels", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "description", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
			{Name: "tags", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: "org_id",
				ReferencedTableName:   "organizations",
				ReferencedColumnName:  "id",
			},
		},
	}

	tableSQLs := migration.sqlschema.Operator().CreateTable(table)
	sqls = append(sqls, tableSQLs...)

	for _, sqlStmt := range sqls {
		if _, err := tx.ExecContext(ctx, string(sqlStmt)); err != nil {
			return err
		}
	}

	err = migration.migrateRulesToRoutePolicies(ctx, tx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addRoutePolicies) migrateRulesToRoutePolicies(ctx context.Context, tx bun.Tx) error {
	var rules []*rule
	err := tx.NewSelect().
		Model(&rules).
		Where("deleted = ?", 0).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil // No rules to migrate
		}
		return errors.NewInternalf(errors.CodeInternal, "failed to fetch rules")
	}

	channelsByOrg, err := migration.getAllChannels(ctx, tx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "fetching channels error: %v", err)
	}

	var routesToInsert []*expressionRoute

	routesToInsert, err = migration.convertRulesToRoutes(rules, channelsByOrg)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "converting rules to routes error: %v", err)
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

	return nil
}

func (migration *addRoutePolicies) convertRulesToRoutes(rules []*rule, channelsByOrg map[string][]string) ([]*expressionRoute, error) {
	var routes []*expressionRoute
	for _, r := range rules {
		var gettableRule ruletypes.GettableRule
		if err := json.Unmarshal([]byte(r.Data), &gettableRule); err != nil {
			return nil, errors.NewInternalf(errors.CodeInternal, "failed to unmarshal rule data for rule ID %s: %v", r.ID, err)
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
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: r.CreatedBy,
				UpdatedBy: r.UpdatedBy,
			},
			Expression:     expression,
			ExpressionKind: "rule",
			Channels:       gettableRule.PreferredChannels,
			Name:           r.ID.StringValue(),
			Enabled:        true,
			OrgID:          r.OrgID,
		}
		routes = append(routes, route)
	}
	return routes, nil
}

func (migration *addRoutePolicies) getAllChannels(ctx context.Context, tx bun.Tx) (map[string][]string, error) {
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

func (migration *addRoutePolicies) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
