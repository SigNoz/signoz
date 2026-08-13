package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

// storableSavedViewSelectFieldsRow is the shape of the `saved_view` table this migration repairs.
type storableSavedViewSelectFieldsRow struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID   string `bun:"id,pk,type:text"`
	Data string `bun:"data,type:text"`
}

// selectedField is a superset of the current shape (name/signal/fieldContext/
// fieldDataType) and the legacy v1 shape (key/dataType/type) it replaced.
type selectedField struct {
	Name          string `json:"name"`
	Signal        string `json:"signal"`
	FieldContext  string `json:"fieldContext"`
	FieldDataType string `json:"fieldDataType"`

	Key      string `json:"key"`
	DataType string `json:"dataType"`
	Type     string `json:"type"`
}

// telemetryFieldKeyOutput is the current shape only.
type telemetryFieldKeyOutput struct {
	Name          string `json:"name"`
	Signal        string `json:"signal"`
	FieldContext  string `json:"fieldContext"`
	FieldDataType string `json:"fieldDataType"`
}

// legacyTypeToFieldContext holds the legacy AttributeKeyType values with no matching
// telemetrytypes.FieldContext alias.
var legacyTypeToFieldContext = map[string]string{
	"spanSearchScope": "span",
}

// legacyDataTypeToFieldDataType holds the legacy AttributeKeyDataType values with no
// matching telemetrytypes.FieldDataType alias.
var legacyDataTypeToFieldDataType = map[string]string{
	"array(string)":  "[]string",
	"array(int64)":   "[]int64",
	"array(float64)": "[]float64",
	"array(bool)":    "[]bool",
}

func fieldContextFromLegacyType(legacyType string) string {
	if mapped, ok := legacyTypeToFieldContext[legacyType]; ok {
		return mapped
	}
	return legacyType
}

func fieldDataTypeFromLegacyDataType(legacyDataType string) string {
	if mapped, ok := legacyDataTypeToFieldDataType[legacyDataType]; ok {
		return mapped
	}
	return legacyDataType
}

type fixSavedViewSelectFields struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewFixSavedViewSelectFieldsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("fix_saved_view_select_fields"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &fixSavedViewSelectFields{sqlstore: sqlstore, settings: ps}, nil
	})
}

func (migration *fixSavedViewSelectFields) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *fixSavedViewSelectFields) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*storableSavedViewSelectFieldsRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	var fixed, skipped int
	for _, row := range rows {
		fixedData, changed, ok := fixSelectFields(row.Data)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be parsed, leaving it untouched", slog.String("saved_view_id", row.ID), slog.String("raw_data", row.Data))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		fixed++
		if _, err := tx.NewUpdate().Model((*storableSavedViewSelectFieldsRow)(nil)).Set("data = ?", fixedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "fixed invalid saved view selectedFields entries", slog.Int("total", len(rows)), slog.Int("fixed", fixed), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *fixSavedViewSelectFields) Down(context.Context, *bun.DB) error {
	return nil
}

// fixSelectFields recovers or drops entries in spec.selectedFields that never got
// mapped from the legacy key/dataType/type shape to the current
// name/fieldContext/fieldDataType shape. Entries that still carry a legacy key are
// recovered by renaming the fields; entries with neither a name nor a key are dropped
// as unrecoverable. Returns ok=false if data can't be parsed at all, and changed=false
// if there was nothing to fix.
func fixSelectFields(data string) (fixed string, changed bool, ok bool) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", false, false
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", false, false
	}

	selectedFieldsRaw, ok := spec["selectedFields"]
	if !ok {
		return "", false, true
	}

	var fieldsRaw []json.RawMessage
	if err := json.Unmarshal(selectedFieldsRaw, &fieldsRaw); err != nil {
		return "", false, false
	}

	fixedFields := make([]json.RawMessage, 0, len(fieldsRaw))
	for _, rawField := range fieldsRaw {
		var field selectedField
		if err := json.Unmarshal(rawField, &field); err != nil {
			return "", false, false
		}

		switch {
		case field.Name != "":
			// already valid -- keep the original bytes untouched, e.g. to preserve
			// description/unit rather than dropping them by re-deriving the entry.
			fixedFields = append(fixedFields, rawField)
		case field.Key != "":
			// legacy shape -- recover by renaming the fields.
			recoveredJSON, err := json.Marshal(telemetryFieldKeyOutput{
				Name:          field.Key,
				FieldContext:  fieldContextFromLegacyType(field.Type),
				FieldDataType: fieldDataTypeFromLegacyDataType(field.DataType),
			})
			if err != nil {
				return "", false, false
			}
			fixedFields = append(fixedFields, recoveredJSON)
			changed = true
		default:
			// neither name nor key -- unrecoverable, drop it.
			changed = true
		}
	}

	if !changed {
		return "", false, true
	}

	fixedFieldsJSON, err := json.Marshal(fixedFields)
	if err != nil {
		return "", false, false
	}
	spec["selectedFields"] = fixedFieldsJSON

	fixedSpec, err := json.Marshal(spec)
	if err != nil {
		return "", false, false
	}
	raw["spec"] = fixedSpec

	fixedData, err := json.Marshal(raw)
	if err != nil {
		return "", false, false
	}

	return string(fixedData), true, true
}
