package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateRecurrenceBounds struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

type plannedMaintenanceScheduleRow struct {
	bun.BaseModel `bun:"table:planned_maintenance"`

	ID       string `bun:"id"`
	Schedule string `bun:"schedule"`
}

func NewMigrateRecurrenceBoundsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_recurrence_bounds"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateRecurrenceBounds{sqlstore: sqlstore, logger: ps.Logger}, nil
		},
	)
}

func (migration *migrateRecurrenceBounds) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

// Up moves the start/end bounds of a recurring planned maintenance from the
// nested recurrence object up to the schedule level. Until now both the
// schedule and its recurrence carried their own startTime/endTime, with the
// recurrence values taking precedence when a recurrence was present. The
// recurrence fields are being dropped, so the recurrence bounds (the source of
// truth for recurring maintenances) are promoted to the schedule before the
// struct loses those fields.
//
// We deliberately operate on the raw JSON instead of the Recurrence struct:
// that struct loses its StartTime/EndTime fields in the same change set, so it
// can no longer read the values this migration needs to move.
func (migration *migrateRecurrenceBounds) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	rows := make([]*plannedMaintenanceScheduleRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		schedule := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Schedule), &schedule); err != nil {
			// A single corrupt row must not abort the whole migration (which would block startup).
			migration.logger.WarnContext(ctx, "skipping planned maintenance with unreadable schedule", slog.String("maintenance_id", row.ID), errors.Attr(err))
			continue
		}

		recurrenceRaw, ok := schedule["recurrence"]
		if !ok || string(recurrenceRaw) == "null" {
			continue
		}

		recurrence := make(map[string]json.RawMessage)
		if err := json.Unmarshal(recurrenceRaw, &recurrence); err != nil {
			migration.logger.WarnContext(ctx, "skipping planned maintenance with unreadable recurrence", slog.String("maintenance_id", row.ID), errors.Attr(err))
			continue
		}

		// Promote the recurrence bounds (source of truth) to the schedule
		// level, then drop them from the recurrence.
		if startTime, ok := recurrence["startTime"]; ok {
			schedule["startTime"] = startTime
			delete(recurrence, "startTime")
		}
		if endTime, ok := recurrence["endTime"]; ok && string(endTime) != "null" {
			schedule["endTime"] = endTime
		} else {
			// The recurrence had no end time, so the schedule must not carry
			// a stale one duplicated by the UI.
			delete(schedule, "endTime")
		}
		delete(recurrence, "endTime")

		newRecurrence, err := json.Marshal(recurrence)
		if err != nil {
			return err
		}
		schedule["recurrence"] = newRecurrence

		newSchedule, err := json.Marshal(schedule)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*plannedMaintenanceScheduleRow)(nil)).
			Set("schedule = ?", string(newSchedule)).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *migrateRecurrenceBounds) Down(context.Context, *bun.DB) error {
	return nil
}
