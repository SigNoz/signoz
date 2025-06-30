package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateOrgDomain struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateOrgDomainFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_org_domain"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newUpdateOrgDomain(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newUpdateOrgDomain(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateOrgDomain{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateOrgDomain) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrgDomain) Up(ctx context.Context, db *bun.DB) error {
	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	orgs := &sqlschema.Table{
		Name: "org_domains",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "data", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{TableName: "org_domains", ColumnNames: []string{"id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{ReferencingTableName: "org_domains", ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
		},
	}

	dropSQLs := migration.sqlschema.DropConstraintUnsafe(ctx, orgs, &sqlschema.UniqueConstraint{TableName: "org_domains", ColumnNames: []string{"name"}})
	for _, sql := range dropSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	indexSQLs := migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "org_domains", ColumnNames: []string{"name", "org_id"}})
	for _, sql := range indexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrgDomain) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
