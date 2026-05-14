package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type migrateMetaresourcesTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewMigrateMetaresourcesTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_metaresources_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &migrateMetaresourcesTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *migrateMetaresourcesTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// migrationTuple describes a single FGA tuple to insert.
type migrationTuple struct {
	roleName   string // "signoz-admin", "signoz-editor", "signoz-viewer"
	objectType string // "serviceaccount", "user", "role", "metaresource"
	objectName string // "serviceaccount", "user", "role", etc.
	relation   string // "create", "list", "detach", etc.
}

func (migration *migrateMetaresourcesTuples) Up(ctx context.Context, db *bun.DB) error {
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

	// Fetch all orgs.
	var orgIDs []string
	rows, err := tx.QueryContext(ctx, `SELECT id FROM organizations`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var orgID string
		if err := rows.Scan(&orgID); err != nil {
			return err
		}
		orgIDs = append(orgIDs, orgID)
	}

	isPG := migration.sqlstore.BunDB().Dialect().Name() == dialect.PG

	// Step 1: Delete all tuples with the old "metaresources" object_type.
	for _, orgID := range orgIDs {
		if isPG {
			_, err = tx.ExecContext(ctx, `DELETE FROM tuple WHERE store = ? AND object_type = ? AND object_id LIKE ?`,
				storeID, "metaresources", "organization/"+orgID+"/%")
		} else {
			_, err = tx.ExecContext(ctx, `DELETE FROM tuple WHERE store = ? AND object_type = ? AND object_id LIKE ?`,
				storeID, "metaresources", "organization/"+orgID+"/%")
		}

		if err != nil {
			return err
		}
	}

	// Step 2: Insert replacement tuples.
	// For types with their own FGA type (user, serviceaccount, role), create/list
	// go on the type directly. For all other resources, create/list go on "metaresource".
	// Also add new detach tuples for role/user/serviceaccount.
	tuples := []migrationTuple{
		// New detach tuples for admin
		{authtypes.SigNozAdminRoleName, "role", "role", "detach"},
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "detach"},
		// Replacement create/list for user/serviceaccount/role (moved from metaresources to own types)
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "create"},
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "list"},
		{authtypes.SigNozAdminRoleName, "role", "role", "create"},
		{authtypes.SigNozAdminRoleName, "role", "role", "list"},
		// Replacement create/list for resources that move from "metaresources" to "metaresource"
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "read"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "update"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "delete"},
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
					storeID, tuple.objectType, objectID, tuple.relation, user, "TUPLE_OPERATION_WRITE", tupleID, now,
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

	return tx.Commit()
}

func (migration *migrateMetaresourcesTuples) Down(context.Context, *bun.DB) error {
	return nil
}
