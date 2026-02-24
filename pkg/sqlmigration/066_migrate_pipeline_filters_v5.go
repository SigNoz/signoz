package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/queryBuilderToExpr"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/transition"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migratePipelineFiltersV5 struct {
	store  sqlstore.SQLStore
	logger *slog.Logger
}

func NewMigratePipelineFiltersV5Factory(
	store sqlstore.SQLStore,
) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_pipeline_filters_v5"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return newMigratePipelineFiltersV5(ctx, c, store, ps.Logger)
		},
	)
}

func newMigratePipelineFiltersV5(
	_ context.Context,
	_ Config,
	store sqlstore.SQLStore,
	logger *slog.Logger,
) (SQLMigration, error) {
	if logger == nil {
		logger = slog.Default()
	}

	return &migratePipelineFiltersV5{
		store:  store,
		logger: logger,
	}, nil
}

func (migration *migratePipelineFiltersV5) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

// pipelineFilterRow is used only during migration to read filter_deprecated and write to filter.
type pipelineFilterRow struct {
	ID               string `bun:"id,pk,type:text"`
	FilterDeprecated string `bun:"filter_deprecated,type:text,notnull"`
}

func (migration *migratePipelineFiltersV5) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// 1. Rename existing filter column to filter_deprecated
	if _, err := migration.store.Dialect().RenameColumn(ctx, tx, "pipelines", "filter", "filter_deprecated"); err != nil {
		return err
	}

	// 2. Add new filter column (v5); existing rows get default ''
	if err := migration.store.Dialect().AddColumn(ctx, tx, "pipelines", "filter", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}

	// 3. Copy v5 filter data: read from filter_deprecated, migrate to v5 expression, write to filter
	var rows []pipelineFilterRow
	if err := tx.NewSelect().
		Table("pipelines").
		Column("id", "filter_deprecated").
		Scan(ctx, &rows); err != nil {
		return err
	}

	for _, r := range rows {
		raw := strings.TrimSpace(r.FilterDeprecated)
		if raw == "" {
			return errors.NewInternalf(errors.CodeInternal, "filter_deprecated is empty")
		}

		var filterSet v3.FilterSet
		if err := json.Unmarshal([]byte(raw), &filterSet); err != nil {
			return err
		}
		expr, migrated, err := transition.BuildFilterExpressionFromFilterSet(ctx, migration.logger, "logs", &filterSet)
		if err != nil || !migrated || strings.TrimSpace(expr) == "" {
			return err
		}

		filter := &qbtypes.Filter{Expression: expr}
		if _, err = queryBuilderToExpr.Parse(filter); err != nil {
			return err
		}
		out, err := json.Marshal(filter)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Table("pipelines").
			Set("filter = ?", string(out)).
			Where("id = ?", r.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *migratePipelineFiltersV5) Down(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// 1. Drop the new filter column
	if err := migration.store.Dialect().DropColumn(ctx, tx, "pipelines", "filter"); err != nil {
		return err
	}

	// 2. Rename filter_deprecated back to filter
	if _, err := migration.store.Dialect().RenameColumn(ctx, tx, "pipelines", "filter_deprecated", "filter"); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
