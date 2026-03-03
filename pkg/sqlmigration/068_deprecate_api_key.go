package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type oldFactorAPIKey68 struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	types.Identifiable
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	Token     string    `bun:"token"`
	Role      string    `bun:"role"`
	Name      string    `bun:"name"`
	ExpiresAt time.Time `bun:"expires_at"`
	LastUsed  time.Time `bun:"last_used"`
	Revoked   bool      `bun:"revoked"`
	UserID    string    `bun:"user_id"`
}

type oldUser68 struct {
	bun.BaseModel `bun:"table:users"`

	types.Identifiable
	DisplayName string `bun:"display_name"`
	Email       string `bun:"email"`
	OrgID       string `bun:"org_id"`
}

type oldRole68 struct {
	bun.BaseModel `bun:"table:role"`

	types.Identifiable
	Name  string `bun:"name"`
	OrgID string `bun:"org_id"`
}

type newServiceAccount68 struct {
	bun.BaseModel `bun:"table:service_account"`

	types.Identifiable
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	Name      string    `bun:"name"`
	Email     string    `bun:"email"`
	Status    string    `bun:"status"`
	OrgID     string    `bun:"org_id"`
}

type newServiceAccountRole68 struct {
	bun.BaseModel `bun:"table:service_account_role"`

	types.Identifiable
	CreatedAt        time.Time `bun:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at"`
	ServiceAccountID string    `bun:"service_account_id"`
	RoleID           string    `bun:"role_id"`
}

type newFactorAPIKey68 struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	types.Identifiable
	CreatedAt        time.Time `bun:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at"`
	Name             string    `bun:"name"`
	Key              string    `bun:"key"`
	ExpiresAt        uint64    `bun:"expires_at"`
	LastObservedAt   time.Time `bun:"last_observed_at"`
	ServiceAccountID string    `bun:"service_account_id"`
}

type deprecateAPIKey struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewDeprecateAPIKeyFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("deprecate_api_key"), func(_ context.Context, _ factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &deprecateAPIKey{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *deprecateAPIKey) Register(migrations *migrate.Migrations) error {
	err := migrations.Register(migration.Up, migration.Down)
	if err != nil {
		return err
	}

	return nil
}

func (migration *deprecateAPIKey) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Step 1: Read all old API keys (skip revoked ones).
	oldKeys := make([]*oldFactorAPIKey68, 0)
	err = tx.NewSelect().Model(&oldKeys).Where("revoked = ?", false).Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	// Step 2: Collect unique user IDs from old keys.
	userIDs := make(map[string]struct{})
	for _, key := range oldKeys {
		userIDs[key.UserID] = struct{}{}
	}

	// Step 3: Load users that own API keys.
	userIDList := make([]string, 0, len(userIDs))
	for uid := range userIDs {
		userIDList = append(userIDList, uid)
	}

	userMap := make(map[string]*oldUser68)
	if len(userIDList) > 0 {
		users := make([]*oldUser68, 0)
		err = tx.NewSelect().Model(&users).Where("id IN (?)", bun.In(userIDList)).Scan(ctx)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		for _, u := range users {
			userMap[u.ID.String()] = u
		}
	}

	// Step 4: Load managed roles to map old role names to role IDs.
	// Build a lookup of (org_id, role_name) -> role_id.
	type orgRoleKey struct {
		OrgID    string
		RoleName string
	}
	roleMap := make(map[orgRoleKey]string)
	if len(userMap) > 0 {
		orgIDs := make(map[string]struct{})
		for _, u := range userMap {
			orgIDs[u.OrgID] = struct{}{}
		}
		orgIDList := make([]string, 0, len(orgIDs))
		for oid := range orgIDs {
			orgIDList = append(orgIDList, oid)
		}

		roles := make([]*oldRole68, 0)
		err = tx.NewSelect().Model(&roles).Where("org_id IN (?)", bun.In(orgIDList)).Scan(ctx)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		for _, r := range roles {
			roleMap[orgRoleKey{OrgID: r.OrgID, RoleName: r.Name}] = r.ID.String()
		}
	}

	// Step 5: Create a service account per user that has API keys, and collect migrated data.
	// One service account per user, all their API keys point to it.
	userIDToServiceAccountID := make(map[string]string)
	serviceAccounts := make([]*newServiceAccount68, 0)
	serviceAccountRoles := make([]*newServiceAccountRole68, 0)
	newKeys := make([]*newFactorAPIKey68, 0)

	// Track which (serviceAccountID, roleID) pairs we've already added.
	type saRoleKey struct {
		ServiceAccountID string
		RoleID           string
	}
	addedRoles := make(map[saRoleKey]struct{})

	now := time.Now()

	for _, oldKey := range oldKeys {
		user, ok := userMap[oldKey.UserID]
		if !ok {
			// User not found — skip this key.
			continue
		}

		// Create service account for this user if not already created.
		saID, exists := userIDToServiceAccountID[oldKey.UserID]
		if !exists {
			saID = valuer.GenerateUUID().String()
			userIDToServiceAccountID[oldKey.UserID] = saID

			serviceAccounts = append(serviceAccounts, &newServiceAccount68{
				Identifiable: types.Identifiable{ID: valuer.MustNewUUID(saID)},
				CreatedAt:    now,
				UpdatedAt:    now,
				Name:         oldKey.Name,
				Email:        user.Email,
				Status:       "active",
				OrgID:        user.OrgID,
			})
		}

		// Map the old role (ADMIN, EDITOR, VIEWER) to the managed role name.
		managedRoleName, ok := roletypes.ExistingRoleToSigNozManagedRoleMap[types.Role(oldKey.Role)]
		if !ok {
			managedRoleName = roletypes.SigNozViewerRoleName
		}

		roleID, ok := roleMap[orgRoleKey{OrgID: user.OrgID, RoleName: managedRoleName}]
		if ok {
			key := saRoleKey{ServiceAccountID: saID, RoleID: roleID}
			if _, added := addedRoles[key]; !added {
				addedRoles[key] = struct{}{}
				serviceAccountRoles = append(serviceAccountRoles, &newServiceAccountRole68{
					Identifiable:     types.Identifiable{ID: valuer.GenerateUUID()},
					CreatedAt:        now,
					UpdatedAt:        now,
					ServiceAccountID: saID,
					RoleID:           roleID,
				})
			}
		}

		// Convert expires_at from time.Time to unix seconds (0 = never expires).
		var expiresAtUnix uint64
		if !oldKey.ExpiresAt.IsZero() && oldKey.ExpiresAt.Unix() > 0 {
			expiresAtUnix = uint64(oldKey.ExpiresAt.Unix())
		}

		// Convert last_used to last_observed_at.
		lastObservedAt := oldKey.LastUsed
		if lastObservedAt.IsZero() {
			lastObservedAt = oldKey.CreatedAt
		}

		newKeys = append(newKeys, &newFactorAPIKey68{
			Identifiable:     oldKey.Identifiable,
			CreatedAt:        oldKey.CreatedAt,
			UpdatedAt:        oldKey.UpdatedAt,
			Name:             oldKey.Name,
			Key:              oldKey.Token,
			ExpiresAt:        expiresAtUnix,
			LastObservedAt:   lastObservedAt,
			ServiceAccountID: saID,
		})
	}

	// Step 6: Insert migrated service accounts and roles.
	if len(serviceAccounts) > 0 {
		if _, err := tx.NewInsert().Model(&serviceAccounts).Exec(ctx); err != nil {
			return err
		}
	}

	if len(serviceAccountRoles) > 0 {
		if _, err := tx.NewInsert().Model(&serviceAccountRoles).Exec(ctx); err != nil {
			return err
		}
	}

	// Step 7: Drop old table, create new table, and insert migrated keys.
	sqls := [][]byte{}

	deprecatedFactorAPIKey, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("factor_api_key"))
	if err != nil {
		return err
	}

	dropTableSQLS := migration.sqlschema.Operator().DropTable(deprecatedFactorAPIKey)
	sqls = append(sqls, dropTableSQLS...)

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "factor_api_key",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "key", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "expires_at", DataType: sqlschema.DataTypeInteger, Nullable: false},
			{Name: "last_observed_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "service_account_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("service_account_id"),
				ReferencedTableName:   sqlschema.TableName("service_account"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "factor_api_key", ColumnNames: []sqlschema.ColumnName{"key"}})
	sqls = append(sqls, indexSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "factor_api_key", ColumnNames: []sqlschema.ColumnName{"name", "service_account_id"}})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// Step 8: Insert migrated keys into the new table.
	if len(newKeys) > 0 {
		if _, err := tx.NewInsert().Model(&newKeys).Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *deprecateAPIKey) Down(context.Context, *bun.DB) error {
	return nil
}
