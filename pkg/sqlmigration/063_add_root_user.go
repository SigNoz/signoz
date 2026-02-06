package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addRootUser struct {
	sqlStore  sqlstore.SQLStore
	sqlSchema sqlschema.SQLSchema
}

func NewAddRootUserFactory(sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_root_user"),
		func(ctx context.Context, settings factory.ProviderSettings, config Config) (SQLMigration, error) {
			return newAddRootUser(ctx, settings, config, sqlStore, sqlSchema)
		},
	)
} 

func newAddRootUser(_ context.Context, _ factory.ProviderSettings, _ Config, sqlStore sqlstore.SQLStore, sqlSchema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addRootUser{sqlStore: sqlStore, sqlSchema: sqlSchema}, nil
}

func (migration *addRootUser) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addRootUser) Up(ctx context.Context, db *bun.DB) error {

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	// create root_users table sqls
	tableSQLs := migration.sqlSchema.Operator().CreateTable(
		&sqlschema.Table{
			Name: "root_users",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "email", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "password_hash", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
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
		},
	)

	sqls = append(sqls, tableSQLs...)

	// create index sqls
	indexSQLs := migration.sqlSchema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("root_users"),
			ColumnNames: []sqlschema.ColumnName{"org_id"},
		},
	)

	sqls = append(sqls, indexSQLs...)

	for _, sqlStmt := range sqls {
		if _, err := tx.ExecContext(ctx, string(sqlStmt)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addRootUser) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
