package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

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

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, "org_preference")
	if err != nil {
		return err
	}

	renamePreferenceIdSQLs := migration.sqlschema.Operator().RenameColumn(table, uniqueConstraints, "preference_id", "name")
	sqls = append(sqls, renamePreferenceIdSQLs...)

	renamePreferenceValueSQLs := migration.sqlschema.Operator().RenameColumn(table, uniqueConstraints, "preference_value", "value")
	sqls = append(sqls, renamePreferenceValueSQLs...)

	recreateTableSQLs := migration.sqlschema.Operator().RecreateTable(table, []*sqlschema.UniqueConstraint{{ColumnNames: []sqlschema.ColumnName{"name", "org_id"}}})
	sqls = append(sqls, recreateTableSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
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
