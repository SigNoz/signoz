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

type updateUserIdentity struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateUserIdentity(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_user_identity"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return &updateUserIdentity{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *updateUserIdentity) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateUserIdentity) Up(ctx context.Context, db *bun.DB) error {
	// 1. Disable FK enforcement
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

	// 2. Fetch existing users
	type existingUser struct {
		bun.BaseModel `bun:"table:users"`
		ID            string `bun:"id"`
		OrgID         string `bun:"org_id"`
	}
	var users []*existingUser
	if err := tx.NewSelect().Model(&users).Scan(ctx); err != nil {
		return err
	}

	// 3. Create identity records for each user
	now := time.Now()
	for _, user := range users {
		if _, err := tx.NewInsert().
			Table("identity").
			Value("id", "?", user.ID).
			Value("status", "?", "active").
			Value("org_id", "?", user.OrgID).
			Value("created_at", "?", now).
			Value("updated_at", "?", now).
			Exec(ctx); err != nil {
			return err
		}
	}

	// 4. Get current table structure
	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	// 5. Get existing indices to preserve them after recreation
	indices, err := migration.sqlschema.GetIndices(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	// 6. Build all SQL statements
	sqls := [][]byte{}

	// Add identity_id column using AddColumn with ColumnName("id") as value
	identityIdColumn := &sqlschema.Column{
		Name:     "identity_id",
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}
	sqls = append(sqls, migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, identityIdColumn, sqlschema.ColumnName("id"))...)

	// Add FK constraint to table definition
	table.ForeignKeyConstraints = append(table.ForeignKeyConstraints, &sqlschema.ForeignKeyConstraint{
		ReferencingColumnName: sqlschema.ColumnName("identity_id"),
		ReferencedTableName:   sqlschema.TableName("identity"),
		ReferencedColumnName:  sqlschema.ColumnName("id"),
	})

	// Recreate table to apply FK constraint
	sqls = append(sqls, migration.sqlschema.Operator().RecreateTable(table, uniqueConstraints)...)

	// Recreate indices that were lost during table recreation
	for _, index := range indices {
		sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(index)...)
	}

	// 7. Execute all SQL statements
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// 8. Re-enable FK enforcement
	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *updateUserIdentity) Down(context.Context, *bun.DB) error {
	return nil
}
