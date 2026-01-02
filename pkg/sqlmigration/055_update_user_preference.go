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

type oldStorableUserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	types.Identifiable
	Name   string      `bun:"preference_id,type:text,notnull"`
	Value  string      `bun:"preference_value,type:text,notnull"`
	UserID valuer.UUID `bun:"user_id,type:text,notnull"`
}

type newStorableUserPreference struct {
	bun.BaseModel `bun:"table:user_preference"`
	types.Identifiable
	Name   string      `bun:"name,type:text,notnull"`
	Value  string      `bun:"value,type:text,notnull"`
	UserID valuer.UUID `bun:"user_id,type:text,notnull"`
}

type updateUserPreference struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateUserPreferenceFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_user_preference"), func(ctx context.Context, settings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newupdateUserPreference(ctx, settings, config, sqlstore, sqlschema)
	})
}

func newupdateUserPreference(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateUserPreference{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateUserPreference) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateUserPreference) Up(ctx context.Context, db *bun.DB) error {
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("user_preference"))
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

	oldUserPreferences := []*oldStorableUserPreference{}
	err = tx.
		NewSelect().
		Model(&oldUserPreferences).
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
		Name: "user_preference",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "value", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("user_id"),
				ReferencedTableName:   sqlschema.TableName("users"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "user_preference", ColumnNames: []sqlschema.ColumnName{"name", "user_id"}})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	userPreferences := []*newStorableUserPreference{}
	for _, preference := range oldUserPreferences {
		userPreferences = append(userPreferences, &newStorableUserPreference{
			Identifiable: preference.Identifiable,
			Name:         preference.Name,
			Value:        preference.Value,
			UserID:       preference.UserID,
		})
	}

	if len(userPreferences) > 0 {
		_, err = tx.
			NewInsert().
			Model(&userPreferences).
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

func (migration *updateUserPreference) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
