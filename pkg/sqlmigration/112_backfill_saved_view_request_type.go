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

// panelTypeToRequestType mirrors savedviewtypes.LegacyRequestTypeForPanelType.
var panelTypeToRequestType = map[string]string{
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

// viewSpec mirrors savedviewtypes.SavedViewSpec, used only to verify the fix round-trips.
type viewSpec struct {
	DisplayName    string          `json:"displayName"`
	PanelType      string          `json:"panelType"`
	RequestType    string          `json:"requestType"`
	Queries        json.RawMessage `json:"queries"`
	SelectedFields json.RawMessage `json:"selectedFields"`
	Display        json.RawMessage `json:"display"`
}

type viewData struct {
	SchemaVersion string   `json:"schemaVersion"`
	Spec          viewSpec `json:"spec"`
}

type savedViewRequestType struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewBackfillSavedViewRequestTypeFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("backfill_view_request_type"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &savedViewRequestType{sqlstore: sqlstore, settings: ps}, nil
	})
}

func (migration *savedViewRequestType) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *savedViewRequestType) Up(ctx context.Context, db *bun.DB) error {
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
		fixedData, ok := backfillSavedViewRequestType(row.Data)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be repaired, leaving it untouched", slog.String("saved_view_id", row.ID), slog.String("raw_data", row.Data))
			skipped++
			continue
		}
		if fixedData == "" {
			// already has a requestType -- nothing to do.
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*storableSavedViewRow)(nil)).Set("data = ?", fixedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "backfilled saved view requestType from panelType", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *savedViewRequestType) Down(context.Context, *bun.DB) error {
	return nil
}

// backfillSavedViewRequestType sets spec.requestType from spec.panelType when absent, leaving
// panelType where it already is. Returns ok=false if data can't be parsed at all, and fixed="" if
// there's nothing to do (requestType already set).
func backfillSavedViewRequestType(data string) (fixed string, ok bool) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", false
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", false
	}

	if requestTypeRaw, ok := spec["requestType"]; ok && string(requestTypeRaw) != `""` {
		return "", true
	}

	var panelType string
	if panelTypeRaw, ok := spec["panelType"]; ok {
		if err := json.Unmarshal(panelTypeRaw, &panelType); err != nil {
			return "", false
		}
	}

	requestType, known := panelTypeToRequestType[panelType]
	if !known {
		requestType = "scalar"
	}
	requestTypeJSON, err := json.Marshal(requestType)
	if err != nil {
		return "", false
	}
	spec["requestType"] = requestTypeJSON

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
	if err := json.Unmarshal(fixedData, new(viewData)); err != nil {
		return "", false
	}

	return string(fixedData), true
}
