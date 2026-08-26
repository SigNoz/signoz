package sqlmigration

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

//go:embed 116_migrate_lambda_dashboards
var lambdaDashboardFiles embed.FS

// These values mirror the cloud integration and dashboard packages but are duplicated
// here so this migration keeps targeting and writing the same rows even if those
// constants are later renamed or changed.
const (
	lambdaDashboardFile = "116_migrate_lambda_dashboards/aws/lambda/overview.json"

	lambdaDashboardSlug               = "aws-lambda-overview"
	cloudIntegrationDashboardProvider = "cloud_integration"
	integrationDashboardSource        = "integration"
	dashboardSchemaVersion            = "v6"
)

type migrateLambdaDashboards struct{}

type lambdaDashboardRow struct {
	bun.BaseModel `bun:"table:dashboard,alias:dashboard"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
}

// lambdaDashboardDefinition is the part of the embedded dashboard this migration reads:
// its spec, which is what the cloud integration stores under data.spec.
type lambdaDashboardDefinition struct {
	Spec map[string]any `json:"spec"`
}

func NewMigrateLambdaDashboardsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_lambda_dashboards"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateLambdaDashboards{}, nil
		},
	)
}

func (m *migrateLambdaDashboards) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

// Up rewrites the spec of every provisioned AWS Lambda overview dashboard to the
// embedded revision that added the FunctionName variable. Cloud integration dashboards
// are provisioned once and never updated afterwards, so existing installs only pick up
// this change through a migration. Only the spec is replaced; the row keeps its id, name,
// tags and metadata, so the dashboard is updated in place rather than recreated.
func (m *migrateLambdaDashboards) Up(ctx context.Context, db *bun.DB) error {
	spec, err := m.loadSpec()
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*lambdaDashboardRow
	if err := tx.NewSelect().
		Model(&rows).
		Join("JOIN integration_dashboard AS id ON id.dashboard_id = dashboard.id").
		Where("id.provider = ?", cloudIntegrationDashboardProvider).
		Where("id.slug = ?", lambdaDashboardSlug).
		Where("dashboard.source = ?", integrationDashboardSource).
		Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		data := map[string]any{}
		if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
			return err
		}

		// The embedded spec is v6-shaped, so only rewrite a row already carrying a v6 spec;
		// anything else is left alone rather than turned into a broken mix of versions.
		if !m.hasV6Spec(data) {
			continue
		}
		data["spec"] = spec

		encoded, err := m.marshalUnescaped(data)
		if err != nil {
			return err
		}
		// Skip rows already carrying this spec so a re-run does not needlessly rewrite them.
		if string(encoded) == row.Data {
			continue
		}

		if _, err := tx.NewUpdate().
			Model((*lambdaDashboardRow)(nil)).
			Set("data = ?", string(encoded)).
			Set("updated_at = ?", time.Now()).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m *migrateLambdaDashboards) Down(context.Context, *bun.DB) error {
	return nil
}

// hasV6Spec reports whether the stored data is a v6 dashboard with a spec object, which
// is the shape whose spec this migration replaces.
func (m *migrateLambdaDashboards) hasV6Spec(data map[string]any) bool {
	metadata, _ := data["metadata"].(map[string]any)
	version, _ := metadata["schemaVersion"].(string)
	if version != dashboardSchemaVersion {
		return false
	}
	_, ok := data["spec"].(map[string]any)
	return ok
}

func (m *migrateLambdaDashboards) marshalUnescaped(v any) ([]byte, error) {
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(v); err != nil {
		return nil, err
	}

	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

func (m *migrateLambdaDashboards) loadSpec() (map[string]any, error) {
	raw, err := lambdaDashboardFiles.ReadFile(lambdaDashboardFile)
	if err != nil {
		return nil, err
	}

	var dashboard lambdaDashboardDefinition
	if err := json.Unmarshal(raw, &dashboard); err != nil {
		return nil, err
	}

	return dashboard.Spec, nil
}
