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

//go:embed 080_cloud_integration_dashboards
var ciDashboardFiles embed.FS

type migrateCloudIntegrationDashboards struct {
	sqlstore sqlstore.SQLStore
}

type ciMigrAccountRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID       string `bun:"id"`
	OrgID    string `bun:"org_id"`
	Provider string `bun:"provider"`
}

type ciMigrServiceRow struct {
	bun.BaseModel `bun:"table:cloud_integration_service"`

	Type               string `bun:"type"`
	Config             string `bun:"config"`
	CloudIntegrationID string `bun:"cloud_integration_id"`
}

type ciMigrServiceConfig struct {
	AWS   *ciMigrProviderConfig `json:"aws"`
	Azure *ciMigrProviderConfig `json:"azure"`
}

type ciMigrProviderConfig struct {
	Metrics *ciMigrMetricsConfig `json:"metrics"`
}

type ciMigrMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type ciMigrDashboardRow struct {
	bun.BaseModel `bun:"table:dashboard"`

	ID        string    `bun:"id,pk,type:text"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	CreatedBy string    `bun:"created_by,type:text"`
	UpdatedBy string    `bun:"updated_by,type:text"`
	Data      string    `bun:"data,type:text"`
	Locked    bool      `bun:"locked"`
	OrgID     string    `bun:"org_id,type:text"`
	Source    string    `bun:"source,type:text"`
}

type ciMigrIntegrationDashboardRow struct {
	bun.BaseModel `bun:"table:integration_dashboards"`

	ID          string    `bun:"id,pk,type:text"`
	OrgID       string    `bun:"org_id,type:text"`
	DashboardID string    `bun:"dashboard_id,type:text"`
	Provider    string    `bun:"provider,type:text"`
	Slug        string    `bun:"slug,type:text"`
	CreatedAt   time.Time `bun:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at"`
}

func NewMigrateCloudIntegrationDashboardsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_cloud_integration_dashboards"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateCloudIntegrationDashboards{sqlstore: sqlstore}, nil
		},
	)
}

func (m *migrateCloudIntegrationDashboards) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *migrateCloudIntegrationDashboards) Up(ctx context.Context, db *bun.DB) error {
	dashboardDefs, err := loadCIDashboardDefs()
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var accounts []*ciMigrAccountRow
	if err := tx.NewSelect().Model(&accounts).Where("removed_at IS NULL").Scan(ctx); err != nil {
		return err
	}

	type accountMeta struct {
		orgID    string
		provider string
	}
	accountMap := make(map[string]accountMeta, len(accounts))
	for _, a := range accounts {
		accountMap[a.ID] = accountMeta{orgID: a.OrgID, provider: a.Provider}
	}

	var services []*ciMigrServiceRow
	if err := tx.NewSelect().Model(&services).Scan(ctx); err != nil {
		return err
	}

	type orgService struct {
		orgID     string
		provider  string
		serviceID string
	}
	seen := make(map[string]struct{})
	var toProvision []orgService

	for _, svc := range services {
		meta, ok := accountMap[svc.CloudIntegrationID]
		if !ok {
			continue
		}

		var cfg ciMigrServiceConfig
		if err := json.Unmarshal([]byte(svc.Config), &cfg); err != nil {
			continue
		}

		if !ciMigrIsMetricsEnabled(&cfg, meta.provider) {
			continue
		}

		key := fmt.Sprintf("%s|%s|%s", meta.orgID, meta.provider, svc.Type)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		toProvision = append(toProvision, orgService{
			orgID:     meta.orgID,
			provider:  meta.provider,
			serviceID: svc.Type,
		})
	}

	now := time.Now()

	for _, os := range toProvision {
		serviceDashes, ok := dashboardDefs[os.provider][os.serviceID]
		if !ok {
			continue
		}

		for dashName, dashJSON := range serviceDashes {
			slug := fmt.Sprintf("%s-%s-%s", os.provider, os.serviceID, dashName)

			count, err := tx.NewSelect().
				TableExpr("integration_dashboards").
				Where("org_id = ?", os.orgID).
				Where("provider = ?", "cloud_integrations").
				Where("slug = ?", slug).
				Count(ctx)
			if err != nil {
				return err
			}
			if count > 0 {
				continue
			}

			dashID := valuer.GenerateUUID().StringValue()

			dashRow := &ciMigrDashboardRow{
				ID:        dashID,
				CreatedAt: now,
				UpdatedAt: now,
				CreatedBy: "",
				UpdatedBy: "",
				Data:      string(dashJSON),
				Locked:    true,
				OrgID:     os.orgID,
				Source:    "integration",
			}
			if _, err := tx.NewInsert().Model(dashRow).Exec(ctx); err != nil {
				return err
			}

			intRow := &ciMigrIntegrationDashboardRow{
				ID:          valuer.GenerateUUID().StringValue(),
				OrgID:       os.orgID,
				DashboardID: dashID,
				Provider:    "cloud_integrations",
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

func (m *migrateCloudIntegrationDashboards) Down(context.Context, *bun.DB) error {
	return nil
}

func loadCIDashboardDefs() (map[string]map[string]map[string]json.RawMessage, error) {
	result := make(map[string]map[string]map[string]json.RawMessage)

	err := fs.WalkDir(ciDashboardFiles, "080_cloud_integration_dashboards", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}

		// path: 080_cloud_integration_dashboards/{provider}/{service}/{file}.json
		rel := strings.TrimPrefix(path, "080_cloud_integration_dashboards/")
		parts := strings.SplitN(rel, "/", 3)
		if len(parts) != 3 {
			return nil
		}
		provider := parts[0]
		serviceID := parts[1]
		dashName := strings.TrimSuffix(parts[2], ".json")

		data, err := ciDashboardFiles.ReadFile(path)
		if err != nil {
			return err
		}

		if result[provider] == nil {
			result[provider] = make(map[string]map[string]json.RawMessage)
		}
		if result[provider][serviceID] == nil {
			result[provider][serviceID] = make(map[string]json.RawMessage)
		}
		result[provider][serviceID][dashName] = json.RawMessage(data)
		return nil
	})

	return result, err
}

func ciMigrIsMetricsEnabled(cfg *ciMigrServiceConfig, provider string) bool {
	switch provider {
	case "aws":
		return cfg.AWS != nil && cfg.AWS.Metrics != nil && cfg.AWS.Metrics.Enabled
	case "azure":
		return cfg.Azure != nil && cfg.Azure.Metrics != nil && cfg.Azure.Metrics.Enabled
	}
	return false
}
