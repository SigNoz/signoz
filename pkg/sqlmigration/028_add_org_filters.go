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
