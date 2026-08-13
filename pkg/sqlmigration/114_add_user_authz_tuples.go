package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type addUserAuthzTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewAddUserAuthzTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_user_authz_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addUserAuthzTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *addUserAuthzTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addUserAuthzTuples) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var storeID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM store WHERE name = ? LIMIT 1`, "signoz").Scan(&storeID)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM tuple WHERE store = ? AND object_type = ? AND object_id LIKE ?`, storeID, "metaresource", "%/factor-password/%"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM changelog WHERE store = ? AND object_type = ? AND object_id LIKE ?`, storeID, "metaresource", "%/factor-password/%"); err != nil {
		return err
	}

	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	isPG := migration.sqlstore.BunDB().Dialect().Name() == dialect.PG

	tuples := []migrationTuple{
		{authtypes.SigNozAdminRoleName, "user", "user", "create"},
		{authtypes.SigNozAdminRoleName, "user", "user", "read"},
		{authtypes.SigNozAdminRoleName, "user", "user", "update"},
		{authtypes.SigNozAdminRoleName, "user", "user", "delete"},
		{authtypes.SigNozAdminRoleName, "user", "user", "list"},
		{authtypes.SigNozAdminRoleName, "user", "user", "attach"},
		{authtypes.SigNozAdminRoleName, "user", "user", "detach"},
		{authtypes.SigNozAdminRoleName, "metaresource", "reset-password-token", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "reset-password-token", "list"},
	}

	for _, orgID := range orgIDs {
		for _, tuple := range tuples {
			entropy := ulid.DefaultEntropy()
			now := time.Now().UTC()
			tupleID := ulid.MustNew(ulid.Timestamp(now), entropy).String()

			objectID := "organization/" + orgID + "/" + tuple.objectName + "/*"
			roleSubject := "organization/" + orgID + "/role/" + tuple.roleName

			if isPG {
				user := "role:" + roleSubject + "#assignee"
				result, err := tx.ExecContext(ctx, `
					INSERT INTO tuple (store, object_type, object_id, relation, _user, user_type, ulid, inserted_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (store, object_type, object_id, relation, _user) DO NOTHING`,
					storeID, tuple.objectType, objectID, tuple.relation, user, "userset", tupleID, now,
				)
				if err != nil {
					return err
				}
				rowsAffected, err := result.RowsAffected()
				if err != nil {
					return err
				}
				if rowsAffected == 0 {
					continue
				}
				_, err = tx.ExecContext(ctx, `
					INSERT INTO changelog (store, object_type, object_id, relation, _user, operation, ulid, inserted_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (store, ulid, object_type) DO NOTHING`,
					storeID, tuple.objectType, objectID, tuple.relation, user, 0, tupleID, now,
				)
				if err != nil {
					return err
				}
			} else {
				result, err := tx.ExecContext(ctx, `
					INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation) DO NOTHING`,
					storeID, tuple.objectType, objectID, tuple.relation, "role", roleSubject, "assignee", "userset", tupleID, now,
				)
				if err != nil {
					return err
				}
				rowsAffected, err := result.RowsAffected()
				if err != nil {
					return err
				}
				if rowsAffected == 0 {
					continue
				}
				_, err = tx.ExecContext(ctx, `
					INSERT INTO changelog (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, operation, ulid, inserted_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (store, ulid, object_type) DO NOTHING`,
					storeID, tuple.objectType, objectID, tuple.relation, "role", roleSubject, "assignee", 0, tupleID, now,
				)
				if err != nil {
					return err
				}
			}
		}
	}

	managedRoleGroups := make(map[string]string, len(coretypes.ManagedRoleToTransactions))
	for roleName, transactions := range coretypes.ManagedRoleToTransactions {
		data, err := json.Marshal(authtypes.NewTransactionGroupsFromTransactions(transactions))
		if err != nil {
			return err
		}
		managedRoleGroups[roleName] = string(data)
	}

	for _, orgID := range orgIDs {
		for roleName, data := range managedRoleGroups {
			if _, err := tx.NewUpdate().
				Model(new(roles)).
				Set("transaction_groups = ?", data).
				Where("org_id = ?", orgID).
				Where("type = ?", authtypes.RoleTypeManaged.StringValue()).
				Where("name = ?", roleName).
				Exec(ctx); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (migration *addUserAuthzTuples) Down(context.Context, *bun.DB) error {
	return nil
}
