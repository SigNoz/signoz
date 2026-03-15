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

type addStatusUser struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddStatusUserFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_status_user"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addStatusUser{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *addStatusUser) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addStatusUser) Up(ctx context.Context, db *bun.DB) error {
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

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	statusColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("status"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, statusColumn, "active")

	// add deleted_at (zero time = not deleted, non-zero = deletion timestamp) to enable the
	// composite unique index that replaces the partial index approach
	deletedAtColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("deleted_at"),
		DataType: sqlschema.DataTypeTimestamp,
		Nullable: false,
	}

	sqls = append(sqls, migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, deletedAtColumn, time.Time{})...)

	// we need to drop the unique index on (email, org_id)
	sqls = append(sqls, migration.sqlschema.Operator().DropIndex(&sqlschema.UniqueIndex{TableName: "users", ColumnNames: []sqlschema.ColumnName{"email", "org_id"}})...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// add a composite unique index on (org_id, email, deleted_at).
	// active and pending users have deleted_at=time.Time{} (zero), forming a unique (org_id, email, zero) tuple.
	// soft-deleted users have deleted_at set to the deletion timestamp, making each deleted row unique
	// and allowing the same email to be re-invited after deletion without a constraint violation.
	newIndexSqls := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "users", ColumnNames: []sqlschema.ColumnName{"org_id", "email", "deleted_at"}})
	for _, sql := range newIndexSqls {
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

func (migration *addStatusUser) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
