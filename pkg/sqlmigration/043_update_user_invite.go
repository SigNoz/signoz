package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateUserInvite struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateUserInviteFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_user_invite"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newUpdateUserInvite(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newUpdateUserInvite(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateUserInvite{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateUserInvite) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateUserInvite) Up(ctx context.Context, db *bun.DB) error {
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("user_invite"))
	if err != nil {
		return err
	}

	sqls := [][]byte{}

	dropSQLs := migration.sqlschema.Operator().DropConstraint(table, uniqueConstraints, &sqlschema.UniqueConstraint{ColumnNames: []sqlschema.ColumnName{"email"}})
	sqls = append(sqls, dropSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []sqlschema.ColumnName{"email", "org_id"}})
	sqls = append(sqls, indexSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []sqlschema.ColumnName{"token"}})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *updateUserInvite) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
