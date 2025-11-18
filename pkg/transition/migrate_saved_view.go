// nolint
package transition

import (
	"log/slog"

	"golang.org/x/net/context"
)

type savedViewMigrateV5 struct {
	migrateCommon
}

func NewSavedViewMigrateV5(logger *slog.Logger, logsDuplicateKeys []string, tracesDuplicateKeys []string) *savedViewMigrateV5 {
	return &savedViewMigrateV5{
		migrateCommon: migrateCommon{ambiguity: make(map[string][]string), logger: logger},
	}
}

func (m *savedViewMigrateV5) Migrate(ctx context.Context, data map[string]any) bool {
	updated := false

	var version string
	if _, ok := data["version"].(string); ok {
		version = data["version"].(string)
	}

	if version == "v5" {
		m.logger.InfoContext(ctx, "saved view is already migrated to v5, skipping")
		return false
	}

	data["queries"] = make([]any, 0)

	if builderQueries, ok := data["builderQueries"].(map[string]any); ok {
		for name, query := range builderQueries {
			if queryMap, ok := query.(map[string]any); ok {
				var panelType string
				if _, ok := data["panelType"].(string); ok {
					panelType = data["panelType"].(string)
				}
				if m.updateQueryData(ctx, queryMap, "v4", panelType) {
					updated = true
				}

				m.logger.InfoContext(ctx, "migrated querymap")

				// wrap it in the v5 envelope
				envelope := m.WrapInV5Envelope(name, queryMap, "builder_query")
				m.logger.InfoContext(ctx, "envelope after wrap", "envelope", envelope)
				data["queries"] = append(data["queries"].([]any), envelope)
			}
		}
	}
	delete(data, "builderQueries")

	data["version"] = "v5"

	return updated
}
