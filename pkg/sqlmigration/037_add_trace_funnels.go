package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// funnel Core Data Structure (funnel and funnelStep)
type funnel struct {
	bun.BaseModel      `bun:"table:trace_funnel"`
	types.Identifiable // funnel id
	types.TimeAuditable
	types.UserAuditable
	Name          string       `json:"funnel_name" bun:"name,type:text,notnull"` // funnel name
	Description   string       `json:"description" bun:"description,type:text"`  // funnel description
	OrgID         valuer.UUID  `json:"org_id" bun:"org_id,type:varchar,notnull"`
	Steps         []funnelStep `json:"steps" bun:"steps,type:text,notnull"`
	Tags          string       `json:"tags" bun:"tags,type:text"`
	CreatedByUser *types.User  `json:"user" bun:"rel:belongs-to,join:created_by=id"`
}

type funnelStep struct {
	types.Identifiable
	Name           string `json:"name,omitempty"`        // step name
	Description    string `json:"description,omitempty"` // step description
	Order          int64  `json:"step_order"`
	ServiceName    string `json:"service_name"`
	SpanName       string `json:"span_name"`
	Filters        string `json:"filters,omitempty"`
	LatencyPointer string `json:"latency_pointer,omitempty"`
	LatencyType    string `json:"latency_type,omitempty"`
	HasErrors      bool   `json:"has_errors"`
}

type addTraceFunnels struct {
	sqlstore sqlstore.SQLStore
}

func NewAddTraceFunnelsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_trace_funnels"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddTraceFunnels(ctx, providerSettings, config, sqlstore)
	})
}

func newAddTraceFunnels(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addTraceFunnels{sqlstore: sqlstore}, nil
}

func (migration *addTraceFunnels) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addTraceFunnels) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	_, err = tx.NewCreateTable().
		Model(new(funnel)).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *addTraceFunnels) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
