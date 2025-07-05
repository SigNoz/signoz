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

	dropSQLs, err := migration.sqlschema.DropConstraint(ctx, "user_invite", &sqlschema.UniqueConstraint{ColumnNames: []string{"email"}})
	if err != nil {
		return err
	}

	for _, sql := range dropSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	indexSQLs := [][]byte{}
	indexSQL, err := migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []string{"email", "org_id"}})
	if err != nil {
		return err
	}

	indexSQLs = append(indexSQLs, indexSQL...)

	indexSQL, err = migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []string{"token"}})
	if err != nil {
		return err
	}

	indexSQLs = append(indexSQLs, indexSQL...)

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

func (migration *updateUserInvite) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
