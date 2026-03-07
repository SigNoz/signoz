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

type oldStorableOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	types.Identifiable
	Name  string      `bun:"preference_id,type:text,notnull"`
	Value string      `bun:"preference_value,type:text,notnull"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull"`
}

type newStorableOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference"`
	types.Identifiable
	Name  string      `bun:"name,type:text,notnull"`
	Value string      `bun:"value,type:text,notnull"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull"`
}

type updateOrgPreference struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateOrgPreferenceFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_org_preference"), func(ctx context.Context, settings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newupdateOrgPreference(ctx, settings, config, sqlstore, sqlschema)
	})
}

func newupdateOrgPreference(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateOrgPreference{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateOrgPreference) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrgPreference) Up(ctx context.Context, db *bun.DB) error {
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("org_preference"))
	if err != nil {
		return err
	}

	for _, col := range table.Columns {
		if col.Name == "name" || col.Name == "value" {
			return nil
		}
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	oldOrgPreferences := []*oldStorableOrgPreference{}
	err = tx.
		NewSelect().
		Model(&oldOrgPreferences).
		Scan(ctx)
	if err != nil {
		return err
	}

	dropSQLs := migration.sqlschema.Operator().DropTable(table)
	for _, sql := range dropSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	sqls := [][]byte{}
	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "org_preference",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "value", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
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
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "org_preference", ColumnNames: []sqlschema.ColumnName{"name", "org_id"}})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	orgPreferences := []*newStorableOrgPreference{}
	for _, preference := range oldOrgPreferences {
		orgPreferences = append(orgPreferences, &newStorableOrgPreference{
			Identifiable: preference.Identifiable,
			Name:         preference.Name,
			Value:        preference.Value,
			OrgID:        preference.OrgID,
		})
	}

	if len(orgPreferences) > 0 {
		_, err = tx.
			NewInsert().
			Model(&orgPreferences).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateOrgPreference) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
