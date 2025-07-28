package transition

import (
	"log/slog"

	"golang.org/x/net/context"
)

type savedViewMigrateV5 struct {
	migrateCommon
	logger *slog.Logger
}

func NewSavedViewMigrateV5(logger *slog.Logger, logsDuplicateKeys []string, tracesDuplicateKeys []string) *savedViewMigrateV5 {
	return &savedViewMigrateV5{
		logger: logger,
	}
}

func (m *savedViewMigrateV5) Migrate(ctx context.Context, data map[string]any) bool {
	updated := false

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
				envelope := m.wrapInV5Envelope(name, queryMap, "builder_query")
				m.logger.InfoContext(ctx, "envelope after wrap", "envelope", envelope)
				data["queries"] = append(data["queries"].([]any), envelope)
			}
		}
	}
	return updated
}
