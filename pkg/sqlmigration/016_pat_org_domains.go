package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updatePatAndOrgDomains struct {
	store sqlstore.SQLStore
}

func NewUpdatePatAndOrgDomainsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_pat_and_org_domains"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdatePatAndOrgDomains(ctx, ps, c, sqlstore)
	})
}

func newUpdatePatAndOrgDomains(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updatePatAndOrgDomains{
		store: store,
	}, nil
}

func (migration *updatePatAndOrgDomains) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePatAndOrgDomains) Up(ctx context.Context, db *bun.DB) error {
	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// get all org ids
	var orgIDs []string
	if err := tx.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	// add org id to pat and org_domains table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "personal_access_tokens", "org_id"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("personal_access_tokens").ColumnExpr("org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE").Exec(ctx); err != nil {
			return err
		}

		// check if there is one org ID if yes then set it to all personal_access_tokens.
		if len(orgIDs) == 1 {
			orgID := orgIDs[0]
			if _, err := tx.NewUpdate().Table("personal_access_tokens").Set("org_id = ?", orgID).Where("org_id IS NULL").Exec(ctx); err != nil {
				return err
			}
		}
	}

	if err := updateOrgId(ctx, tx); err != nil {
		return err
	}

	// change created_at and updated_at from integer to timestamp
	for _, table := range []string{"personal_access_tokens", "org_domains"} {
		if err := migration.store.Dialect().IntToTimestamp(ctx, tx, table, "created_at"); err != nil {
			return err
		}
		if err := migration.store.Dialect().IntToTimestamp(ctx, tx, table, "updated_at"); err != nil {
			return err
		}
	}

	// drop table if exists ingestion_keys
	if _, err := tx.NewDropTable().IfExists().Table("ingestion_keys").Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updatePatAndOrgDomains) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func updateOrgId(ctx context.Context, tx bun.Tx) error {
	if _, err := tx.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:org_domains_new"`

			ID        string `bun:"id,pk,type:text"`
			OrgID     string `bun:"org_id,type:text,notnull"`
			Name      string `bun:"name,type:varchar(50),notnull,unique"`
			CreatedAt int    `bun:"created_at,notnull"`
			UpdatedAt int    `bun:"updated_at"`
			Data      string `bun:"data,type:text,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// copy data from org_domains to org_domains_new
	if _, err := tx.ExecContext(ctx, `INSERT INTO org_domains_new (id, org_id, name, created_at, updated_at, data) SELECT id, org_id, name, created_at, updated_at, data FROM org_domains`); err != nil {
		return err
	}
	// delete old table
	if _, err := tx.NewDropTable().IfExists().Table("org_domains").Exec(ctx); err != nil {
		return err
	}

	// rename new table to org_domains
	if _, err := tx.ExecContext(ctx, `ALTER TABLE org_domains_new RENAME TO org_domains`); err != nil {
		return err
	}
	return nil
}
