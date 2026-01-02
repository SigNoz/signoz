package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type storableOrgDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	types.Identifiable
	Name  string      `bun:"name,type:text,notnull" json:"name"`
	Data  string      `bun:"data,type:text,notnull" json:"-"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull" json:"orgId"`
	types.TimeAuditable
}

type storableAuthDomain struct {
	bun.BaseModel `bun:"table:auth_domain"`

	types.Identifiable
	Name  string      `bun:"name,type:text,notnull" json:"name"`
	Data  string      `bun:"data,type:text,notnull" json:"-"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull" json:"orgId"`
	types.TimeAuditable
}

type renameOrgDomains struct {
	sqlStore  sqlstore.SQLStore
	sqlSchema sqlschema.SQLSchema
}

func NewRenameOrgDomainsFactory(sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("rename_org_domains"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newRenameOrgDomains(ctx, ps, c, sqlStore, sqlSchema)
	})
}

func newRenameOrgDomains(_ context.Context, _ factory.ProviderSettings, _ Config, sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) (SQLMigration, error) {
	return &renameOrgDomains{
		sqlStore:  sqlStore,
		sqlSchema: sqlSchema,
	}, nil
}

func (migration *renameOrgDomains) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *renameOrgDomains) Up(ctx context.Context, db *bun.DB) error {
	// check if the `auth_domain` table already exists
	_, _, err := migration.sqlSchema.GetTable(ctx, sqlschema.TableName("auth_domain"))
	if err == nil {
		return nil
	}

	orgDomainTable, _, err := migration.sqlSchema.GetTable(ctx, sqlschema.TableName("org_domains"))
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	oldOrgDomains := []*storableOrgDomain{}
	err = tx.NewSelect().Model(&oldOrgDomains).Scan(ctx)
	if err != nil {
		return err
	}

	// drop table `org_domains`
	orgDomainDropSQLs := migration.sqlSchema.Operator().DropTable(orgDomainTable)
	for _, sql := range orgDomainDropSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// create table `auth_domain`
	authDomainTableCreateSQLs := migration.sqlSchema.Operator().CreateTable(&sqlschema.Table{
		Name: "auth_domain",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "data", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	for _, sql := range authDomainTableCreateSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// create index on `auth_domain`
	authDomainIndexSQLs := migration.sqlSchema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "auth_domain", ColumnNames: []sqlschema.ColumnName{"name", "org_id"}})
	for _, sql := range authDomainIndexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// convert old org domains to new auth domains
	authDomains := []*storableAuthDomain{}
	for _, orgDomain := range oldOrgDomains {
		authDomains = append(authDomains, &storableAuthDomain{
			Identifiable:  orgDomain.Identifiable,
			TimeAuditable: orgDomain.TimeAuditable,
			Name:          orgDomain.Name,
			Data:          orgDomain.Data,
			OrgID:         orgDomain.OrgID,
		})
	}

	if len(authDomains) > 0 {
		if _, err := tx.NewInsert().Model(&authDomains).Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *renameOrgDomains) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
