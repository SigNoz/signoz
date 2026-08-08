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
// data is decoded generically (map[string]json.RawMessage) rather than into
// savedviewtypes.SavedViewData directly: a row written by the 109 migration may
// hold an incompatible (pre-telemetrytypes.TelemetryFieldKey) selectedFields shape
// -- 109 forwarded that field as raw legacy JSON, which the real type (and thus
// every later read of the row) fails to scan. Every other key is left byte-for-byte
// untouched; this migration only repairs selectedFields.
type storableSavedViewData struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID   string `bun:"id,pk,type:text"`
	Data string `bun:"data,type:text"`
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

	var repaired, failed int
	for _, row := range rows {
		// already scans cleanly as-is -- nothing to repair.
		if err := json.Unmarshal([]byte(row.Data), new(savedviewtypes.SavedViewData)); err == nil {
			continue
		}

		var raw map[string]json.RawMessage
		if err := json.Unmarshal([]byte(row.Data), &raw); err != nil {
			failed++
			migration.settings.Logger.WarnContext(ctx, "saved view data is not valid JSON, leaving as-is", slog.String("saved_view_id", row.ID), slog.Any("error", err))
			continue
		}

		var specRaw map[string]json.RawMessage
		if err := json.Unmarshal(raw["spec"], &specRaw); err != nil {
			failed++
			migration.settings.Logger.WarnContext(ctx, "saved view spec is not valid JSON, leaving as-is", slog.String("saved_view_id", row.ID), slog.Any("error", err))
			continue
		}

		// selectedFields is the only field the 109 migration could have written in an incompatible shape
		if _, ok := specRaw["selectedFields"]; !ok {
			// nothing to fix on this row.
			failed++
			migration.settings.Logger.WarnContext(ctx, "saved view data failed to scan for a reason other than selectedFields, leaving as-is", slog.String("saved_view_id", row.ID))
			continue
		}

		var selectedFields []telemetrytypes.TelemetryFieldKey
		if err := json.Unmarshal(specRaw["selectedFields"], &selectedFields); err == nil {
			// it actually decodes fine on its own; the scan failure must have been
			// something else -- leave the row alone rather than guess.
			failed++
			migration.settings.Logger.WarnContext(ctx, "saved view data failed to scan for a reason other than selectedFields, leaving as-is", slog.String("saved_view_id", row.ID))
			continue
		}

		emptyFields, err := json.Marshal([]telemetrytypes.TelemetryFieldKey{})
		if err != nil {
			return err
		}
		specRaw["selectedFields"] = emptyFields

		fixedSpec, err := json.Marshal(specRaw)
		if err != nil {
			return err
		}
		raw["spec"] = fixedSpec

		fixedData, err := json.Marshal(raw)
		if err != nil {
			return err
		}

		// verify the fix actually round-trips through the real type before writing it.
		if err := json.Unmarshal(fixedData, new(savedviewtypes.SavedViewData)); err != nil {
			failed++
			migration.settings.Logger.WarnContext(ctx, "repaired saved view data still fails to scan, leaving original as-is", slog.String("saved_view_id", row.ID), slog.Any("error", err))
			continue
		}

		if _, err := tx.NewUpdate().Model((*storableSavedViewData)(nil)).Set("data = ?", string(fixedData)).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
		repaired++
	}

	migration.settings.Logger.InfoContext(ctx, "checked saved views for unreadable selectedFields", slog.Int("total", len(rows)), slog.Int("repaired", repaired), slog.Int("failed", failed))

	return tx.Commit()
}

func (migration *fixSavedViewSelectedFields) Down(context.Context, *bun.DB) error {
	return nil
}
