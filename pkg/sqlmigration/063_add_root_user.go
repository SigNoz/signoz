package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addRootUser struct {
	sqlstore sqlstore.SQLStore
}

func NewAddRootUserFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_root_user"),
		func(ctx context.Context, settings factory.ProviderSettings, config Config) (SQLMigration, error) {
			return newAddRootUser(ctx, settings, config, sqlstore)
		},
	)
}

func newAddRootUser(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addRootUser{sqlstore: sqlstore}, nil
}

func (migration *addRootUser) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addRootUser) Up(ctx context.Context, db *bun.DB) error {
	// create root_use table
	if _, err := db.NewCreateTable().
		Model(
			&struct {
				bun.BaseModel `bun:"table:root_users"`
				ID            string `bun:"id,pk,type:text"`
				Email         string `bun:"email,type:text,notnull"`
				PasswordHash  string `bun:"password_hash,type:text,notnull"`
				OrgID         string `bun:"org_id,type:text,notnull"`
				CreatedAt     int    `bun:"created_at,type:bigint,notnull"`
				UpdatedAt     int    `bun:"updated_at,type:bigint,notnull"`
			}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// create unique index on org_id to make sure one root user per org
	if _, err := db.NewCreateIndex().
		Model(
			&struct {
				bun.BaseModel `bun:"table:root_users"`
			}{}).
		Index("idx_root_user_org_id_unique").
		Column("org_id").
		Unique().
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// create index on email for login lookups
	if _, err := db.NewCreateIndex().
		Model(
			&struct {
				bun.BaseModel `bun:"table:root_users"`
			}{}).
		Index("idx_root_user_email").
		Column("email").
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addRootUser) Down(ctx context.Context, db *bun.DB) error {
	// drop root_users table
	if _, err := db.NewDropTable().
		Model(
			&struct {
				bun.BaseModel `bun:"table:root_users"`
			}{}).
		IfExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}
