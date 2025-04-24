package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"time"
)

type createOrgFilters struct {
	store sqlstore.SQLStore
}

func NewCreateOrgFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_org_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &createOrgFilters{store: store}, nil
	})
}

func (m *createOrgFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *createOrgFilters) Up(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*orgFilter)(nil)).
		IfNotExists().
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = db.NewCreateIndex().
		Model((*orgFilter)(nil)).
		Unique().
		Column("org_id", "signal").
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	// Get default organization ID
	var defaultOrg struct {
		ID string `bun:"id"`
	}
	err = db.NewSelect().Table("organizations").Limit(1).Scan(ctx, &defaultOrg)
	if err != nil {
		return err
	}

	// Insert trace filters
	traceFilters := []orgFilter{
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"hasError","datatype":"bool","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"name","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"rpcMethod","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"responseStatusCode","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"httpHost","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"httpMethod","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"httpRoute","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"httpUrl","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"traceID","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
	}

	// Insert log filters
	logFilters := []orgFilter{
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"severity_text","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"host.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"k8s.cluster.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"k8s.deployment.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"k8s.namespace.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"k8s.pod.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
	}

	// Insert API monitoring filters
	apiFilters := []orgFilter{
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "API_MONITORING",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "API_MONITORING",
		},
		{
			OrgID:  defaultOrg.ID,
			Filter: `{"key":"rpcMethod","datatype":"string","type":"tag"}`,
			Signal: "API_MONITORING",
		},
	}

	// Combine all filters
	allFilters := append(traceFilters, logFilters...)
	allFilters = append(allFilters, apiFilters...)

	// Set timestamps for all filters
	now := time.Now()
	for i := range allFilters {
		allFilters[i].CreatedAt = now
		allFilters[i].UpdatedAt = now
	}

	// Insert all filters in a single transaction
	_, err = db.NewInsert().Model(&allFilters).Exec(ctx)
	return err
}

func (m *createOrgFilters) Down(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*orgFilter)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	return err
}

type orgFilter struct {
	bun.BaseModel `bun:"table:org_filters"`

	ID        string    `bun:"id,pk,type:uuid,default:uuid_generate_v4()"`
	OrgID     string    `bun:"org_id,notnull,type:text"`
	Filter    string    `bun:"filter,notnull,type:text"`
	Signal    string    `bun:"signal,notnull,type:text"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
