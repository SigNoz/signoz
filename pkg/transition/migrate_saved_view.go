package transition

import "log/slog"

type savedViewMigrateV5 struct {
	migrateCommon
	logger *slog.Logger
}

func NewSavedViewMigrateV5(logger *slog.Logger, logsDuplicateKeys []string, tracesDuplicateKeys []string) *savedViewMigrateV5 {
	return &savedViewMigrateV5{
		logger: logger,
	}
}

func (m *savedViewMigrateV5) Migrate(data map[string]any) bool {
	updated := false

	if builderQueries, ok := data["builderQueries"].(map[string]any); ok {
		for _, query := range builderQueries {
			if queryMap, ok := query.(map[string]any); ok {
				var panelType string
				if _, ok := data["panelType"].(string); ok {
					panelType = data["panelType"].(string)
				}
				if m.updateQueryData(queryMap, "v4", panelType) {
					updated = true
				}
			}
		}
	}
	return updated
}
