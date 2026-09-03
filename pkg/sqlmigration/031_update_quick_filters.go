package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateQuickFilters struct {
	store sqlstore.SQLStore
}

func NewUpdateQuickFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateQuickFilters(ctx, ps, c, store)
	})
}

func newUpdateQuickFilters(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateQuickFilters{
		store: store,
	}, nil
}

func (migration *updateQuickFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	// Frozen copy of the defaults as this migration shipped; migrations must not
	// read live types. api_monitoring's service.name is "tag" here — 035 fixes it.
	defaultFilters := []struct {
		signal  string
		filters []map[string]any
	}{
		{"traces", []map[string]any{
			{"key": "duration_nano", "dataType": "float64", "type": "tag"},
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "hasError", "dataType": "bool", "type": "tag"},
			{"key": "service.name", "dataType": "string", "type": "resource"},
			{"key": "name", "dataType": "string", "type": "tag"},
			{"key": "rpc.method", "dataType": "string", "type": "tag"},
			{"key": "response_status_code", "dataType": "string", "type": "tag"},
			{"key": "http_host", "dataType": "string", "type": "tag"},
			{"key": "http.method", "dataType": "string", "type": "tag"},
			{"key": "http.route", "dataType": "string", "type": "tag"},
			{"key": "http_url", "dataType": "string", "type": "tag"},
			{"key": "trace_id", "dataType": "string", "type": "tag"},
		}},
		{"logs", []map[string]any{
			{"key": "severity_text", "dataType": "string", "type": "resource"},
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "service.name", "dataType": "string", "type": "resource"},
			{"key": "host.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
		}},
		{"api_monitoring", []map[string]any{
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "service.name", "dataType": "string", "type": "tag"},
			{"key": "rpc.method", "dataType": "string", "type": "tag"},
		}},
		{"exceptions", []map[string]any{
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "service.name", "dataType": "string", "type": "resource"},
			{"key": "host.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
		}},
	}

	signalFilters := make([]struct{ signal, filter string }, 0, len(defaultFilters))
	for _, defaultFilter := range defaultFilters {
		filterJSON, err := json.Marshal(defaultFilter.filters)
		if err != nil {
			return err
		}
		signalFilters = append(signalFilters, struct{ signal, filter string }{defaultFilter.signal, string(filterJSON)})
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Delete all existing quick filters
	_, err = tx.NewDelete().
		Table("quick_filter").
		Where("1=1"). // Delete all rows
		Exec(ctx)
	if err != nil {
		return err
	}

	// Get all organization IDs as strings
	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil {
		if err == sql.ErrNoRows {
			// No organizations found, commit the transaction (deletion is done) and return
			if err := tx.Commit(); err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// For each organization, create new quick filters with the updated defaults
	for _, orgID := range orgIDs {
		now := time.Now()
		quickFilters := make([]*quickFilter, 0, len(signalFilters))
		for _, signalFilter := range signalFilters {
			quickFilters = append(quickFilters, &quickFilter{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				OrgID:  orgID,
				Filter: signalFilter.filter,
				Signal: signalFilter.signal,
				TimeAuditable: types.TimeAuditable{
					CreatedAt: now,
					UpdatedAt: now,
				},
			})
		}

		// Insert all filters for this organization
		_, err = tx.NewInsert().
			Model(&quickFilters).
			Exec(ctx)

		if err != nil {
			if errors.Ast(migration.store.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "Quick Filter already exists"), errors.TypeAlreadyExists) {
				// Skip if filters already exist for this org
				continue
			}
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (migration *updateQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
