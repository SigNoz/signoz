package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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

// quickFilterFieldDataType resolves legacy datatype spellings via the shared
// alias table, with unknowns normalized to unspecified and every numeric
// collapsed to number, matching the fields API and the v1 write path.
func quickFilterFieldDataType(legacyDataType string) string {
	var fieldDataType telemetrytypes.FieldDataType
	if err := fieldDataType.Scan(legacyDataType); err != nil {
		return ""
	}
	if fieldDataType == telemetrytypes.FieldDataTypeInt64 {
		fieldDataType = telemetrytypes.FieldDataTypeNumber
	}
	return fieldDataType.StringValue()
}

// quickFilterFieldContext resolves legacy type spellings via the shared alias
// table and normalizes anything unknown (e.g. "Sum") to unspecified, matching
// what the v1 write path does at runtime.
func quickFilterFieldContext(legacyType string) string {
	if fieldContext, ok := telemetrytypes.FieldContextFromText(legacyType); ok {
		return fieldContext.StringValue()
	}
	return ""
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
			return "", false, false
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
