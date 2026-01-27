package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addResetPasswordTokenExpiry struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddResetPasswordTokenExpiryFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_reset_password_token_expiry"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddResetPasswordTokenExpiry(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddResetPasswordTokenExpiry(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addResetPasswordTokenExpiry{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addResetPasswordTokenExpiry) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addResetPasswordTokenExpiry) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// get the reset_password_token table
	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("reset_password_token"))
	if err != nil {
		return err
	}

	// add a new column `expires_at`
	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("expires_at"),
		DataType: sqlschema.DataTypeTimestamp,
		Nullable: true,
	}

	// for existing rows set
	defaultValueForExistingRows := time.Now()

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, column, defaultValueForExistingRows)

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

func (migration *addResetPasswordTokenExpiry) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
