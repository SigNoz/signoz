package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
)

// semconvQuickFilterRenames holds the stored quick filter names that the
// product defaults replaced with the current semantic-convention spelling.
var semconvQuickFilterRenames = map[string]string{
	"deployment.environment": "deployment.environment.name",
	"http.method":            "http.request.method",
}

type migrateSemconvQuickFilters struct {
	settings factory.ProviderSettings
}

func NewMigrateSemconvQuickFiltersFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_semconv_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &migrateSemconvQuickFilters{settings: ps}, nil
	})
}

func (migration *migrateSemconvQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateSemconvQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*storableQuickFilterRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	var migrated, skipped int
	for _, row := range rows {
		renamed, changed, ok := renameSemconvQuickFilterEntries(row.Filter)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "quick filter could not be parsed, leaving it untouched", slog.String("quick_filter_id", row.ID), slog.String("raw_filter", row.Filter))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*storableQuickFilterRow)(nil)).Set("filter = ?", renamed).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "renamed quick filters to current semantic-convention names", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *migrateSemconvQuickFilters) Down(context.Context, *bun.DB) error {
	return nil
}

// renameSemconvQuickFilterEntries rewrites the renamed names of a stored
// filter list; ok=false means unparseable.
func renameSemconvQuickFilterEntries(filter string) (renamed string, changed bool, ok bool) {
	var entries []telemetryFieldKeyOutput
	if err := json.Unmarshal([]byte(filter), &entries); err != nil {
		return "", false, false
	}

	for i, entry := range entries {
		current, rename := semconvQuickFilterRenames[entry.Name]
		if !rename {
			continue
		}
		entries[i].Name = current
		changed = true
	}

	if !changed {
		return "", false, true
	}

	renamedJSON, err := marshalUnescaped(entries)
	if err != nil {
		return "", false, false
	}
	return string(renamedJSON), true, true
}
