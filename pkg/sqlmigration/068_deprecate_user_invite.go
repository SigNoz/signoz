package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type deprecateUserInvite struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewDeprecateUserInviteFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("deprecate_user_invite"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &deprecateUserInvite{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *deprecateUserInvite) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *deprecateUserInvite) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("user_invite"))
	if err != nil {
		return err
	}

	dropTableSqls := migration.sqlschema.Operator().DropTable(table)

	for _, sql := range dropTableSqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *deprecateUserInvite) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
