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

//go:embed 085_cloud_integration_dashboards
var cloudIntegrationDashboardFiles embed.FS

var (
	CloudProviderAWS   = valuer.NewString("aws")
	CloudProviderAzure = valuer.NewString("azure")
)

type migrateCloudIntegrationDashboards struct {
	sqlstore sqlstore.SQLStore
}

type cloudIntegrationAccountRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID       string `bun:"id"`
	OrgID    string `bun:"org_id"`
	Provider string `bun:"provider"`
}

type cloudIntegrationServiceRow struct {
	bun.BaseModel `bun:"table:cloud_integration_service"`

	Type               string `bun:"type"`
	Config             string `bun:"config"`
	CloudIntegrationID string `bun:"cloud_integration_id"`
}

type cloudIntegrationServiceConfig struct {
	AWS   *cloudIntegrationProviderConfig `json:"aws"`
	Azure *cloudIntegrationProviderConfig `json:"azure"`
}

type cloudIntegrationProviderConfig struct {
	Metrics *cloudIntegrationMetricsConfig `json:"metrics"`
}

type cloudIntegrationMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type cloudIntegrationDashboardRow struct {
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

type cloudIntegrationAccountMeta struct {
	orgID    string
	provider string
}

type cloudIntegrationOrgService struct {
	orgID     string
	provider  string
	serviceID string
}

type integrationDashboardRow struct {
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
	dashboardDefs, err := m.loadDashboardDefs()
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var accounts []*cloudIntegrationAccountRow
	if err := tx.NewSelect().
		Model(&accounts).
		Where("removed_at IS NULL").
		Where("account_id IS NOT NULL").
		Scan(ctx); err != nil {
		return err
	}

	accountMap := make(map[string]cloudIntegrationAccountMeta, len(accounts))
	for _, a := range accounts {
		accountMap[a.ID] = cloudIntegrationAccountMeta{orgID: a.OrgID, provider: a.Provider}
	}

	var services []*cloudIntegrationServiceRow
	if err := tx.NewSelect().Model(&services).Scan(ctx); err != nil {
		return err
	}

	seen := make(map[string]struct{})
	var toProvision []cloudIntegrationOrgService

	for _, svc := range services {
		meta, ok := accountMap[svc.CloudIntegrationID]
		if !ok {
			continue
		}

		var cfg cloudIntegrationServiceConfig
		if err := json.Unmarshal([]byte(svc.Config), &cfg); err != nil {
			continue
		}

		if !m.isMetricsEnabled(&cfg, meta.provider) {
			continue
		}

		key := fmt.Sprintf("%s|%s|%s", meta.orgID, meta.provider, svc.Type)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		toProvision = append(toProvision, cloudIntegrationOrgService{
			orgID:     meta.orgID,
			provider:  meta.provider,
			serviceID: svc.Type,
		})
	}

	now := time.Now()

	for _, service := range toProvision {
		serviceDashboards, ok := dashboardDefs[service.provider][service.serviceID]
		if !ok {
			continue
		}

		for dashName, dashboardJSON := range serviceDashboards {
			slug := fmt.Sprintf("%s-%s-%s", service.provider, service.serviceID, dashName)

			count, err := tx.NewSelect().
				TableExpr("integration_dashboard").
				Where("org_id = ?", service.orgID).
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

			dashRow := &cloudIntegrationDashboardRow{
				ID:        dashID,
				CreatedAt: now,
				UpdatedAt: now,
				CreatedBy: "",
				UpdatedBy: "",
				Data:      string(dashboardJSON),
				Locked:    true,
				OrgID:     service.orgID,
				Source:    "integration",
			}
			if _, err := tx.NewInsert().Model(dashRow).Exec(ctx); err != nil {
				return err
			}

			intRow := &integrationDashboardRow{
				ID:          valuer.GenerateUUID().StringValue(),
				OrgID:       service.orgID,
				DashboardID: dashID,
				Provider:    "cloud_integration",
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

func (m *migrateCloudIntegrationDashboards) loadDashboardDefs() (map[string]map[string]map[string]json.RawMessage, error) {
	result := make(map[string]map[string]map[string]json.RawMessage)

	err := fs.WalkDir(cloudIntegrationDashboardFiles, "085_cloud_integration_dashboards", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}

		// path: 085_cloud_integration_dashboards/{provider}/{service}/{file}.json
		rel := strings.TrimPrefix(path, "085_cloud_integration_dashboards/")
		parts := strings.SplitN(rel, "/", 3)
		if len(parts) != 3 {
			return nil
		}
		provider := parts[0]
		serviceID := parts[1]
		dashName := strings.TrimSuffix(parts[2], ".json")

		data, err := cloudIntegrationDashboardFiles.ReadFile(path)
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

func (m *migrateCloudIntegrationDashboards) isMetricsEnabled(cfg *cloudIntegrationServiceConfig, provider string) bool {
	switch provider {
	case CloudProviderAWS.String():
		return cfg.AWS != nil && cfg.AWS.Metrics != nil && cfg.AWS.Metrics.Enabled
	case CloudProviderAzure.String():
		return cfg.Azure != nil && cfg.Azure.Metrics != nil && cfg.Azure.Metrics.Enabled
	}
	return false
}
