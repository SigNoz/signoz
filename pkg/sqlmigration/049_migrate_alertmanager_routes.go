package sqlmigration

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/common/model"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateAlertmanagerRoutes struct{}

func NewMigrateAlertmanagerRoutesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_alertmanager_routes"), newMigrateAlertmanagerRoutes)
}

func newMigrateAlertmanagerRoutes(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &migrateAlertmanagerRoutes{}, nil
}

func (migration *migrateAlertmanagerRoutes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *migrateAlertmanagerRoutes) Up(ctx context.Context, db *bun.DB) error {
	// Get all alertmanager configs that haven't been migrated yet
	rows, err := db.NewSelect().
		Table("alertmanager_config").
		Where("migrated = ? OR migrated IS NULL", false).
		Rows(ctx)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var configRow struct {
			ID     string `bun:"id"`
			Config string `bun:"config"`
			Hash   string `bun:"hash"`
			OrgID  string `bun:"org_id"`
		}

		if err := db.ScanRow(ctx, rows, &configRow); err != nil {
			continue // Skip invalid rows
		}

		// Parse the alertmanager config
		var alertConfig config.Config
		if err := json.Unmarshal([]byte(configRow.Config), &alertConfig); err != nil {
			continue // Skip invalid configs
		}

		// Perform the migration
		migrated := migrateRoutesInConfig(&alertConfig)
		if !migrated {
			// Mark as migrated even if no changes were needed
			if _, err := db.NewUpdate().
				Table("alertmanager_config").
				Set("migrated = ?", true).
				Where("id = ?", configRow.ID).
				Exec(ctx); err != nil {
				slog.Error("Failed to mark config as migrated", "id", configRow.ID, "error", err)
			}
			continue
		}

		// Serialize the updated config
		updatedConfigBytes, err := json.Marshal(&alertConfig)
		if err != nil {
			continue // Skip if serialization fails
		}

		updatedConfig := string(updatedConfigBytes)
		updatedHash := fmt.Sprintf("%x", md5.Sum([]byte(updatedConfig)))

		// Update the database
		if _, err := db.NewUpdate().
			Table("alertmanager_config").
			Set("config = ?", updatedConfig).
			Set("hash = ?", updatedHash).
			Set("updated_at = ?", time.Now()).
			Set("migrated = ?", true).
			Where("id = ?", configRow.ID).
			Exec(ctx); err != nil {
			slog.Error("Failed to update migrated config", "id", configRow.ID, "error", err)
		}
	}

	return nil
}

func (migration *migrateAlertmanagerRoutes) Down(ctx context.Context, db *bun.DB) error {
	// Reset migrated flag to allow re-migration if needed
	if _, err := db.NewUpdate().
		Table("alertmanager_config").
		Set("migrated = ?", false).
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

// migrateRoutesInConfig performs the actual migration logic on an alertmanager config
func migrateRoutesInConfig(alertConfig *config.Config) bool {
	if alertConfig.Route == nil {
		return false
	}

	var routesToRemove []int
	migratedAny := false

	// Process each existing route
	for i, route := range alertConfig.Route.Routes {
		if ruleIDs := extractRuleIDsFromRoute(route); len(ruleIDs) > 0 {
			routesToRemove = append(routesToRemove, i)

			for _, ruleID := range ruleIDs {
				if ruleID == "-1" {
					continue
				}

				thresholdMapping := map[string][]string{
					"critical": []string{route.Receiver},
				}

				ruleGrouping := alertmanagertypes.RuleGrouping{
					GroupBy:        []string{"alertname"},
					RepeatInterval: 12 * time.Hour,
				}

				// Check if this looks like a notification policy route (has non-ruleId matchers)
				isNotificationPolicy := hasNonRuleIDMatchers(route)

				if !isNotificationPolicy {
					err := addRuleToDefaultRoute(alertConfig, ruleID, ruleGrouping, thresholdMapping)
					if err != nil {
						continue // Skip this rule if migration fails
					}
					migratedAny = true
				}
			}
		}
	}

	// Remove old routes in reverse order to maintain indices
	for i := len(routesToRemove) - 1; i >= 0; i-- {
		idx := routesToRemove[i]
		alertConfig.Route.Routes = append(
			alertConfig.Route.Routes[:idx],
			alertConfig.Route.Routes[idx+1:]...,
		)
		migratedAny = true
	}

	// Validate the config after migration
	if migratedAny {
		if err := alertConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
			return false // Migration failed validation
		}
	}

	return migratedAny
}

// Helper functions from the original matcher.go

func extractRuleIDsFromRoute(route *config.Route) []string {
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			if matcher.Type == labels.MatchRegexp {
				// For regexp matchers, split by |
				return strings.Split(matcher.Value, "|")
			} else {
				// For exact matchers, return single value
				return []string{matcher.Value}
			}
		}
	}
	return []string{}
}

func hasNonRuleIDMatchers(route *config.Route) bool {
	for _, matcher := range route.Matchers {
		if matcher.Name != "ruleId" {
			return true
		}
	}
	return false
}

func addRuleToDefaultRoute(alertConfig *config.Config, ruleID string, ruleGrouping alertmanagertypes.RuleGrouping, thresholdMapping map[string][]string) error {
	if alertConfig.Route == nil {
		return fmt.Errorf("alertConfig route is nil")
	}

	// Find or create default route
	var defaultRoute *config.Route
	for _, route := range alertConfig.Route.Routes {
		// Default route has only noRuleIDMatcher or no special matchers
		if len(route.Matchers) == 1 && route.Matchers[0].Name == "ruleId" && route.Matchers[0].Value == "-1" && route.Receiver == "default-receiver" {
			defaultRoute = route
			break
		}
	}

	if defaultRoute == nil {
		// Create default route
		noRuleIDMatcher, err := labels.NewMatcher(labels.MatchRegexp, "ruleId", "-1")
		if err != nil {
			return err
		}

		defaultRoute = &config.Route{
			Receiver: "default-receiver",
			Matchers: []*labels.Matcher{noRuleIDMatcher},
			Routes:   []*config.Route{},
		}
		alertConfig.Route.Routes = append(alertConfig.Route.Routes, defaultRoute)
	}

	// Convert types for Prometheus config
	groupBy := make([]model.LabelName, len(ruleGrouping.GroupBy))
	for i, label := range ruleGrouping.GroupBy {
		groupBy[i] = model.LabelName(label)
	}
	
	duration := model.Duration(ruleGrouping.RepeatInterval)

	// Create rule node under default route
	ruleNode := &config.Route{
		Receiver:       "default-receiver",
		GroupBy:        groupBy,
		GroupWait:      &duration,
		GroupInterval:  &duration,
		RepeatInterval: &duration,
		Routes:         []*config.Route{},
	}

	// Add rule matcher
	ruleMatcher, err := labels.NewMatcher(labels.MatchEqual, "ruleId", ruleID)
	if err != nil {
		return err
	}
	ruleNode.Matchers = []*labels.Matcher{ruleMatcher}

	// Add threshold routes
	for threshold, receivers := range thresholdMapping {
		for _, receiver := range receivers {
			thresholdMatcher, err := labels.NewMatcher(labels.MatchEqual, "severity", threshold)
			if err != nil {
				continue
			}

			thresholdRoute := &config.Route{
				Receiver: receiver,
				Matchers: []*labels.Matcher{thresholdMatcher},
			}

			ruleNode.Routes = append(ruleNode.Routes, thresholdRoute)
		}
	}

	defaultRoute.Routes = append(defaultRoute.Routes, ruleNode)
	return nil
}