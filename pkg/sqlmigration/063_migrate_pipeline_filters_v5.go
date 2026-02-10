package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/query-service/queryBuilderToExpr"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
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

func (migration *migratePipelineFiltersV5) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var pipelines []pipelinetypes.StoreablePipeline
	if err := tx.NewSelect().
		Table("pipelines").
		Column("id", "filter").
		Scan(ctx, &pipelines); err != nil {
		return err
	}

	for _, p := range pipelines {
		raw := strings.TrimSpace(p.FilterString)
		if raw == "" {
			continue
		}

		// Skip migration if this already looks like a v5 filter
		// ({ "expression": "..." }), but still persist the normalized form
		// if we changed it.
		var vf qbtypes.Filter
		if err := json.Unmarshal([]byte(raw), &vf); err == nil && strings.TrimSpace(vf.Expression) != "" {
			continue
		}

		// Attempt to treat the existing JSON as a v3 FilterSet and build a v5
		// expression from it, using the normalized payload.
		expr, migrated, err := transition.BuildFilterExpressionFromFilterSet(ctx, migration.logger, "logs", raw)
		if err != nil || !migrated || strings.TrimSpace(expr) == "" {
			return err
		}

		filter := &qbtypes.Filter{Expression: expr}
		_, err = queryBuilderToExpr.Parse(filter)
		if err != nil {
			return err
		}

		// Store back as v5-style Filter JSON.
		out, err := json.Marshal(filter)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Table("pipelines").
			Set("filter = ?", string(out)).
			Where("id = ?", p.ID).
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
	// Not reversible: v3 FilterSet structure is lost once we convert to a v5 expression.
	return nil
}
