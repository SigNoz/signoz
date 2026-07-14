package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

var (
	userRoleToSigNozManagedRoleMap = map[string]string{
		"ADMIN":  "signoz-admin",
		"EDITOR": "signoz-editor",
		"VIEWER": "signoz-viewer",
	}
)

type userRow struct {
	ID    string `bun:"id"`
	Role  string `bun:"role"`
	OrgID string `bun:"org_id"`
}

type roleRow struct {
	ID    string `bun:"id"`
	Name  string `bun:"name"`
	OrgID string `bun:"org_id"`
}

type orgRoleKey struct {
	OrgID    string
	RoleName string
}

type addUserRole struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

type userRoleRow struct {
	bun.BaseModel `bun:"table:user_role"`

	types.Identifiable
	UserID string `bun:"user_id"`
	RoleID string `bun:"role_id"`
	types.TimeAuditable
}

func NewAddUserRoleFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_user_role"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addUserRole{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addUserRole) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addUserRole) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "user_role",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "role_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("user_id"),
				ReferencedTableName:   sqlschema.TableName("users"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
			{
				ReferencingColumnName: sqlschema.ColumnName("role_id"),
				ReferencedTableName:   sqlschema.TableName("role"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})

	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "user_role",
			ColumnNames: []sqlschema.ColumnName{"user_id", "role_id"},
		},
	)

	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// fill the new user_role table for existing users
	var users []userRow
	err = tx.NewSelect().TableExpr("users").ColumnExpr("id, role, org_id").Scan(ctx, &users)
	if err != nil {
		return err
	}

	if len(users) == 0 {
		return tx.Commit()
	}

	orgIDs := make(map[string]struct{})
	for _, u := range users {
		orgIDs[u.OrgID] = struct{}{}
	}

	orgIDList := make([]string, 0, len(orgIDs))
	for oid := range orgIDs {
		orgIDList = append(orgIDList, oid)
	}

	var roles []roleRow
	err = tx.NewSelect().TableExpr("role").ColumnExpr("id, name, org_id").Where("org_id IN (?)", bun.In(orgIDList)).Scan(ctx, &roles)
	if err != nil {
		return err
	}

	roleMap := make(map[orgRoleKey]string)
	for _, r := range roles {
		roleMap[orgRoleKey{OrgID: r.OrgID, RoleName: r.Name}] = r.ID
	}

	now := time.Now()
	userRoles := make([]*userRoleRow, 0, len(users))
	for _, u := range users {
		managedRoleName, ok := userRoleToSigNozManagedRoleMap[u.Role]
		if !ok {
			managedRoleName = "signoz-viewer" // fallback
		}

		roleID := roleMap[orgRoleKey{OrgID: u.OrgID, RoleName: managedRoleName}]

		userRoles = append(userRoles, &userRoleRow{
			Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
			UserID:       u.ID,
			RoleID:       roleID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: now,
				UpdatedAt: now,
			},
		})
	}

	if len(userRoles) > 0 {
		if _, err := tx.NewInsert().Model(&userRoles).Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addUserRole) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
