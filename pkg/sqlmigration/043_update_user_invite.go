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

	users := &sqlschema.Table{
		Name: "user_invite",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "email", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "token", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "role", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{TableName: "user_invite", ColumnNames: []string{"id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{ReferencingTableName: "user_invite", ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
		},
	}

	dropSQLs := migration.sqlschema.DropConstraintUnsafe(ctx, users, &sqlschema.UniqueConstraint{TableName: "user_invite", ColumnNames: []string{"email"}})
	for _, sql := range dropSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	indexSQLs := migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []string{"email", "org_id"}})
	indexSQLs = append(indexSQLs, migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "user_invite", ColumnNames: []string{"token"}})...)
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
