package sqlmigration

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

//go:embed 087_migrate_installed_integration_dashboards
var installedIntegrationDashboardFiles embed.FS

type migrateInstalledIntegrationDashboards struct {
	sqlstore sqlstore.SQLStore
}

type installedIntegrationRow struct {
	bun.BaseModel `bun:"table:installed_integration"`

	Type  string `bun:"type"`
	OrgID string `bun:"org_id"`
}

type installedIntegrationOrgKey struct {
	orgID           string
	integrationType string
}

type installedIntDashboardRow struct {
	bun.BaseModel `bun:"table:dashboard"`

	ID        string    `bun:"id,pk,type:text"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	CreatedBy *string   `bun:"created_by,type:text"`
	UpdatedBy *string   `bun:"updated_by,type:text"`
	Data      string    `bun:"data,type:text"`
	Locked    bool      `bun:"locked"`
	OrgID     string    `bun:"org_id,type:text"`
	Source    string    `bun:"source,type:text"`
}

type installedIntDashboardLinkRow struct {
	bun.BaseModel `bun:"table:integration_dashboard"`

	ID          string    `bun:"id,pk,type:text"`
	DashboardID string    `bun:"dashboard_id,type:text"`
	Provider    string    `bun:"provider,type:text"`
	Slug        string    `bun:"slug,type:text"`
	CreatedAt   time.Time `bun:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at"`
}

func NewMigrateInstalledIntegrationDashboardsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_installed_integration_dashboards"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateInstalledIntegrationDashboards{sqlstore: sqlstore}, nil
		},
	)
}

func (m *migrateInstalledIntegrationDashboards) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *migrateInstalledIntegrationDashboards) Up(ctx context.Context, db *bun.DB) error {
	dashboardDefs, err := m.loadDashboardDefs()
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var installations []*installedIntegrationRow
	if err := tx.NewSelect().Model(&installations).Scan(ctx); err != nil {
		return err
	}

	seen := make(map[installedIntegrationOrgKey]struct{})
	now := time.Now()

	for _, inst := range installations {
		key := installedIntegrationOrgKey{orgID: inst.OrgID, integrationType: inst.Type}
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}

		defs, ok := dashboardDefs[inst.Type]
		if !ok {
			continue
		}

		for dashName, dashboardJSON := range defs {
			slug := fmt.Sprintf("%s-%s", inst.Type, dashName)

			count, err := tx.NewSelect().
				TableExpr("integration_dashboard AS id").
				Join("JOIN dashboard AS d ON id.dashboard_id = d.id").
				Where("d.org_id = ?", inst.OrgID).
				Where("id.provider = ?", "installed_integration").
				Where("id.slug = ?", slug).
				Count(ctx)
			if err != nil {
				return err
			}
			if count > 0 {
				continue
			}

			dashID := valuer.GenerateUUID().StringValue()

			dashRow := &installedIntDashboardRow{
				ID:        dashID,
				CreatedAt: now,
				UpdatedAt: now,
				Data:      string(dashboardJSON),
				Locked:    true,
				OrgID:     inst.OrgID,
				Source:    "integration",
			}
			if _, err := tx.NewInsert().Model(dashRow).Exec(ctx); err != nil {
				return err
			}

			intRow := &installedIntDashboardLinkRow{
				ID:          valuer.GenerateUUID().StringValue(),
				DashboardID: dashID,
				Provider:    "installed_integration",
				Slug:        slug,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if _, err := tx.NewInsert().Model(intRow).Exec(ctx); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (m *migrateInstalledIntegrationDashboards) Down(context.Context, *bun.DB) error {
	return nil
}

// loadDashboardDefs returns map[integrationID]map[dashName]rawJSON.
// Only non-_dot dashboard files are loaded (the standard variants).
func (m *migrateInstalledIntegrationDashboards) loadDashboardDefs() (map[string]map[string]json.RawMessage, error) {
	result := make(map[string]map[string]json.RawMessage)

	err := fs.WalkDir(installedIntegrationDashboardFiles, "087_migrate_installed_integration_dashboards", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}

		// path: 087_migrate_installed_integration_dashboards/{integrationID}/{dashName}.json
		rel := strings.TrimPrefix(path, "087_migrate_installed_integration_dashboards/")
		parts := strings.SplitN(rel, "/", 2)
		if len(parts) != 2 {
			return nil
		}
		integrationID := parts[0]
		dashName := strings.TrimSuffix(parts[1], ".json")

		data, err := installedIntegrationDashboardFiles.ReadFile(path)
		if err != nil {
			return err
		}

		if result[integrationID] == nil {
			result[integrationID] = make(map[string]json.RawMessage)
		}
		result[integrationID][dashName] = json.RawMessage(data)
		return nil
	})

	return result, err
}
