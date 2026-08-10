package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

// knownQueryTypes mirrors the discriminator values qbtypes.QueryType currently defines.
var knownQueryTypes = map[string]bool{
	"builder_query":          true,
	"builder_ai_query":       true,
	"builder_formula":        true,
	"builder_sub_query":      true,
	"builder_join":           true,
	"builder_trace_operator": true,
	"clickhouse_sql":         true,
	"promql":                 true,
}

// specFieldZeroValueJSON is the JSON to substitute for a spec key that fails to unmarshal.
var specFieldZeroValueJSON = map[string]string{
	"displayName":    `""`,
	"panelType":      `""`,
	"queries":        `[]`,
	"selectedFields": `[]`,
	"display":        `{}`,
}

// storableSavedViewData is the shape of the `saved_view` table this migration repairs.
type storableSavedViewData struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID   string `bun:"id,pk,type:text"`
	Data string `bun:"data,type:text"`
}

// queryEnvelope mirrors minimal requied qbtypes.QueryEnvelope.
type queryEnvelope struct {
	Type string          `json:"type"`
	Spec json.RawMessage `json:"spec"`
}

// telemetryFieldKey mirrors required fields from telemetrytypes.TelemetryFieldKey.
type telemetryFieldKey struct {
	Name string `json:"name"`
}

// fixDisplay mirrors savedviewtypes.Display.
type fixDisplay struct {
	MaxLines int    `json:"maxLines"`
	FontSize string `json:"fontSize"`
	Format   string `json:"format"`
	Color    string `json:"color"`
}

// fixSpec mirrors savedviewtypes.SavedViewSpec.
type fixSpec struct {
	DisplayName    string              `json:"displayName"`
	PanelType      string              `json:"panelType"`
	Queries        []queryEnvelope     `json:"queries"`
	SelectedFields []telemetryFieldKey `json:"selectedFields"`
	Display        fixDisplay          `json:"display"`
}

// fixData mirrors savedviewtypes.SavedViewData.
type fixData struct {
	SchemaVersion string  `json:"schemaVersion"`
	Spec          fixSpec `json:"spec"`
}

type fixSavedViewSelectedFields struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewFixSavedViewSelectedFieldsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("fix_saved_view_selected_fields"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &fixSavedViewSelectedFields{sqlstore: sqlstore, settings: ps}, nil
	})
}

func (migration *fixSavedViewSelectedFields) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *fixSavedViewSelectedFields) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*storableSavedViewData
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil && err != sql.ErrNoRows {
		return err
	}

	var repaired, deleted int
	for _, row := range rows {
		fixedData, blanked, ok := repairSavedViewData(row.Data)
		if ok && len(blanked) == 0 {
			// already scans cleanly field-by-field -- nothing to repair. Note
			// this must go through the same strict, per-field check repairSavedViewData
			// uses, not a loose json.Unmarshal(row.Data, new(fixData)): Go's decoder
			// happily accepts the legacy {"query":"select 1"} shape into queryEnvelope
			// as a zero-valued {Type:"", Spec:nil} without erroring, which would make
			// a loose top-level check skip exactly the rows this migration exists to fix.
			continue
		}
		if !ok {
			// unrepairable: the row already 500s on every read today, so there's
			// nothing usable to preserve under a fake name. Log the raw bytes for
			// forensics, then delete outright rather than leaving a placeholder
			// row that would show up in ListSavedViews looking like a real view.
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be repaired field-by-field, deleting the row", slog.String("saved_view_id", row.ID), slog.String("raw_data", row.Data))
			if _, err := tx.NewDelete().Model((*storableSavedViewData)(nil)).Where("id = ?", row.ID).Exec(ctx); err != nil {
				return err
			}
			deleted++
			continue
		}

		repaired++
		migration.settings.Logger.WarnContext(ctx, "repaired saved view data by blanking fields that failed to unmarshal", slog.String("saved_view_id", row.ID), slog.Any("fields_blanked", blanked))

		if _, err := tx.NewUpdate().Model((*storableSavedViewData)(nil)).Set("data = ?", fixedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "checked saved views for unreadable data", slog.Int("total", len(rows)), slog.Int("repaired", repaired), slog.Int("deleted", deleted))

	return tx.Commit()
}

func (migration *fixSavedViewSelectedFields) Down(context.Context, *bun.DB) error {
	return nil
}

// specFieldUnmarshalsCleanly reports whether value can be unmarshalled into
// the expected shape of the given savedviewtypes.SavedViewSpec JSON key.
func specFieldUnmarshalsCleanly(key string, value json.RawMessage) bool {
	switch key {
	case "displayName", "panelType":
		var s string
		return json.Unmarshal(value, &s) == nil
	case "queries":
		var q []queryEnvelope
		if err := json.Unmarshal(value, &q); err != nil {
			return false
		}
		for _, e := range q {
			if !knownQueryTypes[e.Type] || len(e.Spec) == 0 {
				return false
			}
		}
		return true
	case "selectedFields":
		var f []telemetryFieldKey
		return json.Unmarshal(value, &f) == nil
	case "display":
		var d fixDisplay
		return json.Unmarshal(value, &d) == nil
	default:
		return true
	}
}

// repairSavedViewData tries to make data unmarshal cleanly by blanking, one key at a time,
// whichever top-level spec fields fail to unmarshal into their expected shape.
func repairSavedViewData(data string) (fixed string, blanked []string, ok bool) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", nil, false
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", nil, false
	}

	for key, value := range spec {
		if specFieldUnmarshalsCleanly(key, value) {
			continue
		}
		zero, known := specFieldZeroValueJSON[key]
		if !known {
			continue
		}
		spec[key] = json.RawMessage(zero)
		blanked = append(blanked, key)
	}

	fixedSpec, err := json.Marshal(spec)
	if err != nil {
		return "", nil, false
	}
	raw["spec"] = fixedSpec

	fixedData, err := json.Marshal(raw)
	if err != nil {
		return "", nil, false
	}

	// verify the fix actually round-trips before writing it.
	if err := json.Unmarshal(fixedData, new(fixData)); err != nil {
		return "", nil, false
	}

	return string(fixedData), blanked, true
}
