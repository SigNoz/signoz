package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/alertmanager/routestrategy"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"log/slog"
	"strings"
)

type migrateAlertmanagerRoutes struct {
	strategy routestrategy.RoutingStrategy
}

func NewMigrateAlertmanagerRoutesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_alertmanager_routes"), newMigrateAlertmanagerRoutes)
}

func newMigrateAlertmanagerRoutes(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	strategy := routestrategy.NewChannelRoutingStrategy()
	return &migrateAlertmanagerRoutes{strategy: strategy}, nil
}

func (migration *migrateAlertmanagerRoutes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *migrateAlertmanagerRoutes) Up(ctx context.Context, db *bun.DB) error {
	// Get existing alertmanager configs to extract receiver->ruleIds mappings
	configRows, err := db.NewSelect().
		Table("alertmanager_config").
		Rows(ctx)
	if err != nil {
		return err
	}

	// Map to store ruleId -> receivers mappings from existing configs
	ruleReceiverMap := make(map[string][]string)
	var amConfig *alertmanagertypes.Config
	for configRows.Next() {
		var storableConfig alertmanagertypes.StoreableConfig
		if err := db.ScanRow(ctx, configRows, &storableConfig); err != nil {
			continue
		}
		amConfig, err = alertmanagertypes.NewConfigFromStoreableConfig(&storableConfig)
		if err != nil {
			return err
		}
		extractReceiverRuleMappings(amConfig.AlertmanagerConfig().Route, ruleReceiverMap)
	}

	if err := configRows.Close(); err != nil {
		slog.Error("Failed to close config rows", "error", err)
	}

	if amConfig == nil {
		return nil // No configs found, nothing to migrate
	}

	amConfig.AlertmanagerConfig().Route.Routes = nil

	ruleRows, err := db.NewSelect().
		Table("rule").
		Where("deleted = 0").
		Rows(ctx)
	if err != nil {
		return err
	}

	for ruleRows.Next() {
		var dbRule ruletypes.Rule
		if err := db.ScanRow(ctx, ruleRows, &dbRule); err != nil {
			continue
		}
		postableRule, err := ruletypes.ParsePostableRule([]byte(dbRule.Data))
		if err != nil {
			continue
		}
		severity := postableRule.Labels["severity"]
		if severity == "" {
			severity = "critical"
		}
		postableRule.Thresholds = map[string][]string{
			severity: ruleReceiverMap[dbRule.ID.String()],
		}
		if err := migration.strategy.AddDirectRules(amConfig, dbRule.ID.String(), *postableRule); err != nil {
			return err
		}
	}
	if err := ruleRows.Close(); err != nil {
		slog.Error("Failed to close rule rows", "error", err)
	}

	amConfig.UpdateStoreableConfig()

	// Update the existing config in the database
	_, err = db.NewUpdate().
		Model(amConfig.StoreableConfig()).
		Where("id = ?", amConfig.StoreableConfig().ID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

// extractReceiverRuleMappings extracts ruleId->receivers mappings from alertmanager routes
func extractReceiverRuleMappings(route *config.Route, ruleReceiverMap map[string][]string) {
	if route == nil {
		return
	}

	// Check matchers for ruleId patterns
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			ruleIds := strings.Split(matcher.Value, "|")
			for _, ruleId := range ruleIds {
				if ruleId == "-1" {
					continue
				}
				ruleReceiverMap[ruleId] = append(ruleReceiverMap[ruleId], route.Receiver)
			}
		}
	}

	// Recursively check child routes
	for _, childRoute := range route.Routes {
		extractReceiverRuleMappings(childRoute, ruleReceiverMap)
	}
}

func (migration *migrateAlertmanagerRoutes) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
