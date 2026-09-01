package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type storableQuickFilterRow struct {
	bun.BaseModel `bun:"table:quick_filter"`

	ID     string `bun:"id,pk"`
	Filter string `bun:"filter"`
}

// legacyQuickFilterEntry carries both shapes a stored entry can be in: the
// legacy key/type/dataType shape and the current name-carrying shape.
type legacyQuickFilterEntry struct {
	Name     string `json:"name"`
	Key      string `json:"key"`
	Type     string `json:"type"`
	DataType string `json:"dataType"`
	Signal   string `json:"signal"`
}

// quickFilterLegacyTypeToFieldContext maps the v3 attribute key types the v1
// write path could store. Materialized top-level fields carried no type, and
// anything unknown (e.g. "Sum" in the old meter defaults) normalizes to
// unspecified, matching what the v1 write path does at runtime.
var quickFilterLegacyTypeToFieldContext = map[string]string{
	"tag":      "attribute",
	"resource": "resource",
	"scope":    "scope",
}

// quickFilterLegacyDataTypeToFieldDataType maps the v3 attribute key data
// types the v1 write path could store, with numerics collapsed to number,
// matching the fields API and the v1 write path.
var quickFilterLegacyDataTypeToFieldDataType = map[string]string{
	"string":  "string",
	"bool":    "bool",
	"int64":   "number",
	"float64": "number",
}

type migrateQuickFilters struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewMigrateQuickFiltersFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &migrateQuickFilters{sqlstore: sqlstore, settings: ps}, nil
	})
}

func (migration *migrateQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateQuickFilters) Up(ctx context.Context, db *bun.DB) error {
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
		migratedFilter, changed, ok := migrateQuickFilterEntries(row.Filter)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "quick filter could not be parsed, leaving it untouched", slog.String("quick_filter_id", row.ID), slog.String("raw_filter", row.Filter))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*storableQuickFilterRow)(nil)).Set("filter = ?", migratedFilter).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "migrated quick filters to telemetry field keys", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	if _, err := migration.sqlstore.Dialect().RenameColumn(ctx, tx, "quick_filter", "signal", "source"); err != nil {
		return err
	}

	for _, column := range []string{"created_by", "updated_by"} {
		if err := migration.sqlstore.Dialect().DropColumn(ctx, tx, "quick_filter", column); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *migrateQuickFilters) Down(context.Context, *bun.DB) error {
	return nil
}

// migrateQuickFilterEntries rewrites a stored filter list from the legacy
// key/dataType/type shape to telemetry field keys; ok=false means unparseable.
func migrateQuickFilterEntries(filter string) (migrated string, changed bool, ok bool) {
	var entriesRaw []json.RawMessage
	if err := json.Unmarshal([]byte(filter), &entriesRaw); err != nil {
		return "", false, false
	}

	migratedEntries := make([]json.RawMessage, 0, len(entriesRaw))
	for _, rawEntry := range entriesRaw {
		var entry legacyQuickFilterEntry
		if err := json.Unmarshal(rawEntry, &entry); err != nil {
			// Some stored entries are plain strings rather than objects; treat
			// the string as the filter key name, dropping empty ones.
			var name string
			if err := json.Unmarshal(rawEntry, &name); err != nil {
				return "", false, false
			}
			entry = legacyQuickFilterEntry{Key: name}
		}

		switch {
		case entry.Name != "":
			migratedEntries = append(migratedEntries, rawEntry)
		case entry.Key != "":
			migratedJSON, err := marshalUnescaped(telemetryFieldKeyOutput{
				Name:          entry.Key,
				Signal:        entry.Signal,
				FieldContext:  quickFilterFieldContext(entry.Type),
				FieldDataType: quickFilterFieldDataType(entry.DataType),
			})
			if err != nil {
				return "", false, false
			}
			migratedEntries = append(migratedEntries, migratedJSON)
			changed = true
		default:
			changed = true
		}
	}

	if !changed {
		return "", false, true
	}

	migratedJSON, err := marshalUnescaped(migratedEntries)
	if err != nil {
		return "", false, false
	}

	return string(migratedJSON), true, true
}

// quickFilterFieldDataType resolves legacy datatype spellings, with unknowns
// normalized to unspecified.
func quickFilterFieldDataType(legacyDataType string) string {
	return quickFilterLegacyDataTypeToFieldDataType[strings.ToLower(strings.TrimSpace(legacyDataType))]
}

// quickFilterFieldContext resolves legacy type spellings, with unknowns
// normalized to unspecified.
func quickFilterFieldContext(legacyType string) string {
	return quickFilterLegacyTypeToFieldContext[strings.ToLower(strings.TrimSpace(legacyType))]
}
