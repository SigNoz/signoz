package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addAuthToken struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddAuthTokenFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_auth_token"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddAuthToken(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddAuthToken(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addAuthToken{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addAuthToken) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAuthToken) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	token := &sqlschema.Table{
		Name: "auth_token",
		Columns: []*sqlschema.Column{
			{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("meta"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("prev_access_token"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			{Name: sqlschema.ColumnName("access_token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("prev_refresh_token"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			{Name: sqlschema.ColumnName("refresh_token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("last_observed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			{Name: sqlschema.ColumnName("rotated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
			{Name: sqlschema.ColumnName("user_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
		},
	}

	sqls := [][]byte{}
	createSQLs := migration.sqlschema.Operator().CreateTable(token)
	sqls = append(sqls, createSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "auth_token", ColumnNames: []sqlschema.ColumnName{"access_token"}})
	sqls = append(sqls, indexSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "auth_token", ColumnNames: []sqlschema.ColumnName{"refresh_token"}})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addAuthToken) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
