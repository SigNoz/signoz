package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addRole struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddRoleFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_role"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddRole(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddRole(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addRole{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addRole) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addRole) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}
	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "role",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "display_name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "description", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "type", DataType: sqlschema.DataTypeText, Nullable: false},
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
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "role", ColumnNames: []sqlschema.ColumnName{"display_name", "org_id"}})
	sqls = append(sqls, indexSQLs...)

	for _, sqlStmt := range sqls {
		if _, err := tx.ExecContext(ctx, string(sqlStmt)); err != nil {
			return err
		}
	}

	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	type storableRole struct {
		bun.BaseModel `bun:"table:role"`

		types.Identifiable
		types.TimeAuditable
		DisplayName string `bun:"display_name,type:string"`
		Description string `bun:"description,type:string"`
		Type        string `bun:"type,type:string"`
		OrgID       string `bun:"org_id,type:string"`
	}

	for _, orgID := range orgIDs {
		roles := []storableRole{
			{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				DisplayName: "SigNoz Admin",
				Description: "Default SigNoz Admin with all the permissions",
				Type:        "managed",
				OrgID:       orgID,
			},
			{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				DisplayName: "SigNoz Editor",
				Description: "Default SigNoz Editor with certain write permission",
				Type:        "managed",
				OrgID:       orgID,
			},
			{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				DisplayName: "SigNoz Viewer",
				Description: "Org member role with permissions to view and collaborate",
				Type:        "managed",
				OrgID:       orgID,
			},
		}

		if _, err := tx.NewInsert().
			Model(&roles).
			Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addRole) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
