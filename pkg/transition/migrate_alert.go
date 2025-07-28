package transition

import (
	"log/slog"

	"golang.org/x/net/context"
)

type alertMigrateV5 struct {
	migrateCommon
	logger *slog.Logger
}

func NewAlertMigrateV5(logger *slog.Logger, logsDuplicateKeys []string, tracesDuplicateKeys []string) *alertMigrateV5 {
	ambiguity := map[string][]string{
		"logs":   logsDuplicateKeys,
		"traces": tracesDuplicateKeys,
	}

	return &alertMigrateV5{
		migrateCommon: migrateCommon{
			ambiguity: ambiguity,
			logger:    logger,
		},
		logger: logger,
	}
}

func (m *alertMigrateV5) Migrate(ctx context.Context, ruleData map[string]any) bool {

	updated := false

	ruleCondition, ok := ruleData["condition"].(map[string]any)
	if !ok {
		m.logger.InfoContext(ctx, "didn't find condition")
		return updated
	}

	compositeQuery, ok := ruleCondition["compositeQuery"].(map[string]any)
	if !ok {
		m.logger.InfoContext(ctx, "didn't find composite query")
		return updated
	}

	if compositeQuery["queries"] == nil {
		compositeQuery["queries"] = []any{}
	}
	m.logger.InfoContext(ctx, "setup empty list")

	queryType := compositeQuery["queryType"]

	// Migrate builder queries
	if builderQueries, ok := compositeQuery["builderQueries"].(map[string]any); ok && len(builderQueries) > 0 && queryType == "builder" {
		m.logger.InfoContext(ctx, "found builderQueries")
		queryType, _ := compositeQuery["queryType"].(string)
		if queryType == "builder" {
			for name, query := range builderQueries {
				if queryMap, ok := query.(map[string]any); ok {
					m.logger.InfoContext(ctx, "mapping builder query")
					var panelType string
					if pt, ok := compositeQuery["panelType"].(string); ok {
						panelType = pt
					}

					if m.updateQueryData(ctx, queryMap, "v4", panelType) {
						updated = true
					}
					m.logger.InfoContext(ctx, "migrated querymap")

					// wrap it in the v5 envelope
					envelope := m.wrapInV5Envelope(name, queryMap, "builder_query")
					m.logger.InfoContext(ctx, "envelope after wrap", "envelope", envelope)
					compositeQuery["queries"] = append(compositeQuery["queries"].([]any), envelope)
				}
			}
			// Clear old field after migration
			delete(compositeQuery, "builderQueries")
		}
	}

	// Migrate prom queries
	if promQueries, ok := compositeQuery["promQueries"].(map[string]any); ok && len(promQueries) > 0 && queryType == "promql" {
		for name, query := range promQueries {
			if queryMap, ok := query.(map[string]any); ok {
				envelope := map[string]any{
					"type": "promql",
					"spec": map[string]any{
						"name":     name,
						"query":    queryMap["query"],
						"disabled": queryMap["disabled"],
						"legend":   queryMap["legend"],
					},
				}
				compositeQuery["queries"] = append(compositeQuery["queries"].([]any), envelope)
				updated = true
			}
		}
		// Clear old field after migration
		delete(compositeQuery, "promQueries")
	}

	// Migrate clickhouse queries
	if chQueries, ok := compositeQuery["chQueries"].(map[string]any); ok && len(chQueries) > 0 && queryType == "clickhouse_sql" {
		for name, query := range chQueries {
			if queryMap, ok := query.(map[string]any); ok {
				envelope := map[string]any{
					"type": "clickhouse_sql",
					"spec": map[string]any{
						"name":     name,
						"query":    queryMap["query"],
						"disabled": queryMap["disabled"],
						"legend":   queryMap["legend"],
					},
				}
				compositeQuery["queries"] = append(compositeQuery["queries"].([]any), envelope)
				updated = true
			}
		}
		// Clear old field after migration
		delete(compositeQuery, "chQueries")
	}

	ruleData["version"] = "v5"

	return updated
}
