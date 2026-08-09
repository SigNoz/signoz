package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

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

// storableSavedViewData is the shape of the `saved_view` table this migration repairs.
type storableSavedViewData struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID   string `bun:"id,pk,type:text"`
	Data string `bun:"data,type:text"`
}

// specFieldUnmarshalsCleanly reports whether value can be unmarshalled into
// the real type of the given savedviewtypes.SavedViewSpec JSON key.
func specFieldUnmarshalsCleanly(key string, value json.RawMessage) bool {
	switch key {
	case "displayName", "panelType":
		var s string
		return json.Unmarshal(value, &s) == nil
	case "queries":
		var q []qbtypes.QueryEnvelope
		return json.Unmarshal(value, &q) == nil
	case "selectedFields":
		var f []telemetrytypes.TelemetryFieldKey
		return json.Unmarshal(value, &f) == nil
	case "display":
		var d savedviewtypes.Display
		return json.Unmarshal(value, &d) == nil
	default:
		return true
	}
}

// specFieldZeroValueJSON is the JSON to substitute for a spec key that fails
// to unmarshal into its real type.
var specFieldZeroValueJSON = map[string]string{
	"displayName":    `""`,
	"panelType":      `""`,
	"queries":        `[]`,
	"selectedFields": `[]`,
	"display":        `{}`,
}

// repairSavedViewData tries to make data unmarshal cleanly into
// savedviewtypes.SavedViewData by blanking, one key at a time, whichever
// top-level spec fields fail to unmarshal into their real type -- e.g. a
// selectedFields shape the 109 migration forwarded verbatim from a
// pre-telemetrytypes.TelemetryFieldKey install, or a queries shape that
// predates the current discriminated-union QueryEnvelope. Every other key is
// left byte-for-byte untouched. Returns ok=false if data/spec aren't even
// JSON objects, or the result still doesn't unmarshal cleanly afterward.
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

	// verify the fix actually round-trips through the real type before writing it.
	if err := json.Unmarshal(fixedData, new(savedviewtypes.SavedViewData)); err != nil {
		return "", nil, false
	}

	return string(fixedData), blanked, true
}

// placeholderSavedViewData is substituted whole when a row can't be repaired
// field-by-field (data/spec aren't JSON objects at all, or repair still
// doesn't unmarshal cleanly). It must itself always unmarshal cleanly, since
// every Get/List reads saved_view.data straight into savedviewtypes.SavedViewData
// -- leaving genuinely-unrepairable data in place would 500 on every future read.
func placeholderSavedViewData(id string) string {
	data, err := json.Marshal(savedviewtypes.SavedViewData{
		SchemaVersion: savedviewtypes.SavedViewSchemaVersion.StringValue(),
		Spec: savedviewtypes.SavedViewSpec{
			DisplayName: fmt.Sprintf("corrupted saved view %s", id),
			PanelType:   savedviewtypes.PanelTypeTable,
		},
	})
	if err != nil {
		// marshalling a static, well-formed literal cannot fail.
		panic(err)
	}
	return string(data)
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

	var repaired, replaced int
	for _, row := range rows {
		// already scans cleanly as-is -- nothing to repair.
		if err := json.Unmarshal([]byte(row.Data), new(savedviewtypes.SavedViewData)); err == nil {
			continue
		}

		fixedData, blanked, ok := repairSavedViewData(row.Data)
		if !ok {
			fixedData = placeholderSavedViewData(row.ID)
			replaced++
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be repaired field-by-field, replacing with a placeholder view", slog.String("saved_view_id", row.ID))
		} else {
			repaired++
			migration.settings.Logger.WarnContext(ctx, "repaired saved view data by blanking fields that failed to unmarshal", slog.String("saved_view_id", row.ID), slog.Any("fields_blanked", blanked))
		}

		if _, err := tx.NewUpdate().Model((*storableSavedViewData)(nil)).Set("data = ?", fixedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "checked saved views for unreadable data", slog.Int("total", len(rows)), slog.Int("repaired", repaired), slog.Int("replaced", replaced))

	return tx.Commit()
}

func (migration *fixSavedViewSelectedFields) Down(context.Context, *bun.DB) error {
	return nil
}
