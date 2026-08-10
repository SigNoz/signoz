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

// legacyPanelTypeToRequestType mirrors savedviewtypes.LegacyRequestTypeForPanelType,
// duplicated here since sqlmigration must not import pkg/types.
var legacyPanelTypeToRequestType = map[string]string{
	"list":  "raw",
	"trace": "trace",
	"graph": "time_series",
}

// storableSavedViewRow is the shape of the `saved_view` table this migration repairs.
type storableSavedViewRow struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID   string `bun:"id,pk,type:text"`
	Data string `bun:"data,type:text"`
}

// movedDisplay mirrors savedviewtypes.Display after panelType moves in.
type movedDisplay struct {
	PanelType string `json:"panelType"`
	MaxLines  int    `json:"maxLines"`
	FontSize  string `json:"fontSize"`
	Format    string `json:"format"`
	Color     string `json:"color"`
}

// movedSpec mirrors savedviewtypes.SavedViewSpec after panelType moves into display.
type movedSpec struct {
	DisplayName    string          `json:"displayName"`
	RequestType    string          `json:"requestType"`
	Queries        json.RawMessage `json:"queries"`
	SelectedFields json.RawMessage `json:"selectedFields"`
	Display        movedDisplay    `json:"display"`
}

type movedData struct {
	SchemaVersion string    `json:"schemaVersion"`
	Spec          movedSpec `json:"spec"`
}

type moveSavedViewPanelTypeToDisplay struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewMoveSavedViewPanelTypeToDisplayFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("move_saved_view_panel_type"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &moveSavedViewPanelTypeToDisplay{sqlstore: sqlstore, settings: ps}, nil
	})
}

func (migration *moveSavedViewPanelTypeToDisplay) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *moveSavedViewPanelTypeToDisplay) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*storableSavedViewRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	var migrated, skipped int
	for _, row := range rows {
		fixedData, ok := moveSavedViewRowPanelType(row.Data)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be repaired, leaving it untouched", slog.String("saved_view_id", row.ID), slog.String("raw_data", row.Data))
			skipped++
			continue
		}
		if fixedData == "" {
			// already migrated -- no top-level panelType key left to move.
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*storableSavedViewRow)(nil)).Set("data = ?", fixedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "moved saved view panelType into display", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *moveSavedViewPanelTypeToDisplay) Down(context.Context, *bun.DB) error {
	return nil
}

// moveSavedViewRowPanelType moves spec.panelType into spec.display.panelType and backfills
// spec.requestType from it when absent. Returns ok=false if data can't be parsed at all, and
// fixed="" if there's nothing to do (no top-level panelType left, already migrated).
func moveSavedViewRowPanelType(data string) (fixed string, ok bool) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", false
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", false
	}

	panelTypeRaw, hasPanelType := spec["panelType"]
	if !hasPanelType {
		return "", true
	}

	var panelType string
	if err := json.Unmarshal(panelTypeRaw, &panelType); err != nil {
		return "", false
	}
	delete(spec, "panelType")

	var display map[string]json.RawMessage
	if displayRaw, ok := spec["display"]; ok {
		if err := json.Unmarshal(displayRaw, &display); err != nil {
			display = map[string]json.RawMessage{}
		}
	}
	if display == nil {
		display = map[string]json.RawMessage{}
	}
	panelTypeJSON, err := json.Marshal(panelType)
	if err != nil {
		return "", false
	}
	display["panelType"] = panelTypeJSON

	displayJSON, err := json.Marshal(display)
	if err != nil {
		return "", false
	}
	spec["display"] = displayJSON

	if requestTypeRaw, ok := spec["requestType"]; !ok || string(requestTypeRaw) == `""` {
		requestType, known := legacyPanelTypeToRequestType[panelType]
		if !known {
			requestType = "scalar"
		}
		requestTypeJSON, err := json.Marshal(requestType)
		if err != nil {
			return "", false
		}
		spec["requestType"] = requestTypeJSON
	}

	fixedSpec, err := json.Marshal(spec)
	if err != nil {
		return "", false
	}
	raw["spec"] = fixedSpec

	fixedData, err := json.Marshal(raw)
	if err != nil {
		return "", false
	}

	// verify the fix actually round-trips before writing it.
	if err := json.Unmarshal(fixedData, new(movedData)); err != nil {
		return "", false
	}

	return string(fixedData), true
}
