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

type createQuickFilters struct {
	store sqlstore.SQLStore
}

type quickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  string `bun:"org_id,notnull,unique:org_id_signal,type:text"`
	Filter string `bun:"filter,notnull,type:text"`
	Signal string `bun:"signal,notnull,unique:org_id_signal,type:text"`
	types.TimeAuditable
	types.UserAuditable
}

func NewCreateQuickFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &createQuickFilters{store: store}, nil
	})
}

func (m *createQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *createQuickFilters) Up(ctx context.Context, db *bun.DB) error {
	// Frozen copy of the defaults as this migration shipped (hence the old
	// camelCase keys); migrations must not read live types. 031 replaces these rows.
	defaultFilters := []struct {
		signal  string
		filters []map[string]any
	}{
		{"traces", []map[string]any{
			{"key": "duration_nano", "dataType": "float64", "type": "tag"},
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "hasError", "dataType": "bool", "type": "tag"},
			{"key": "serviceName", "dataType": "string", "type": "tag"},
			{"key": "name", "dataType": "string", "type": "resource"},
			{"key": "rpcMethod", "dataType": "string", "type": "tag"},
			{"key": "responseStatusCode", "dataType": "string", "type": "resource"},
			{"key": "httpHost", "dataType": "string", "type": "tag"},
			{"key": "httpMethod", "dataType": "string", "type": "tag"},
			{"key": "httpRoute", "dataType": "string", "type": "tag"},
			{"key": "httpUrl", "dataType": "string", "type": "tag"},
			{"key": "traceID", "dataType": "string", "type": "tag"},
		}},
		{"logs", []map[string]any{
			{"key": "severity_text", "dataType": "string", "type": "resource"},
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "serviceName", "dataType": "string", "type": "tag"},
			{"key": "host.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
		}},
		{"api_monitoring", []map[string]any{
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "serviceName", "dataType": "string", "type": "tag"},
			{"key": "rpcMethod", "dataType": "string", "type": "tag"},
		}},
		{"exceptions", []map[string]any{
			{"key": "deployment.environment", "dataType": "string", "type": "resource"},
			{"key": "serviceName", "dataType": "string", "type": "tag"},
			{"key": "host.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.cluster.name", "dataType": "string", "type": "tag"},
			{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
			{"key": "k8s.namespace.name", "dataType": "string", "type": "tag"},
			{"key": "k8s.pod.name", "dataType": "string", "type": "tag"},
		}},
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Create table if not exists
	_, err = tx.NewCreateTable().
		Model((*quickFilter)(nil)).
		IfNotExists().
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE`).
		Exec(ctx)
	if err != nil {
		return err
	}

	// Get default organization ID
	var defaultOrg valuer.UUID
	err = tx.NewSelect().Table("organizations").Column("id").Limit(1).Scan(ctx, &defaultOrg)
	if err != nil {
		if err == sql.ErrNoRows {
			// No organizations found, nothing to insert, commit and return
			err := tx.Commit()
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	now := time.Now()
	quickFilters := make([]*quickFilter, 0, len(defaultFilters))
	for _, defaultFilter := range defaultFilters {
		filterJSON, err := json.Marshal(defaultFilter.filters)
		if err != nil {
			return err
		}

		quickFilters = append(quickFilters, &quickFilter{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  defaultOrg.StringValue(),
			Filter: string(filterJSON),
			Signal: defaultFilter.signal,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: now,
				UpdatedAt: now,
			},
		})
	}

	// Insert all filters at once
	_, err = tx.NewInsert().
		Model(&quickFilters).
		Exec(ctx)

	if err != nil {
		if errors.Ast(m.store.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "Quick Filter already exists"), errors.TypeAlreadyExists) {
			err := tx.Commit()
			if err != nil {
				return err
			}
			return nil
		}
		return err
	}

	// Commit the transaction
	return tx.Commit()
}

func (m *createQuickFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
