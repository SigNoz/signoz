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

		// Also clean up changelog entries for the old type.
		if isPG {
			_, err = tx.ExecContext(ctx, `DELETE FROM changelog WHERE store = ? AND object_type = ?`,
				storeID, "metaresources")
		} else {
			_, err = tx.ExecContext(ctx, `DELETE FROM changelog WHERE store = ? AND object_type = ?`,
				storeID, "metaresources")
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
		{authtypes.SigNozAdminRoleName, "user", "user", "detach"},
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "detach"},
		// Replacement create/list for user/serviceaccount/role (moved from metaresources to own types)
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "create"},
		{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "list"},
		{authtypes.SigNozAdminRoleName, "user", "user", "create"},
		{authtypes.SigNozAdminRoleName, "user", "user", "list"},
		{authtypes.SigNozAdminRoleName, "role", "role", "create"},
		{authtypes.SigNozAdminRoleName, "role", "role", "list"},
		// Replacement create/list for resources that move from "metaresources" to "metaresource"
		{authtypes.SigNozAdminRoleName, "metaresource", "auth-domain", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "auth-domain", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "cloud-integration", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "cloud-integration", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "cloud-integration-service", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "cloud-integration-service", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "integration", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "integration", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-password", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "factor-password", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "license", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "license", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "subscription", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "subscription", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "organization", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "organization", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "org-preference", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "org-preference", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "session", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "pipeline", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "pipeline", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "planned-maintenance", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "planned-maintenance", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "rule", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "rule", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "saved-view", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "saved-view", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "trace-funnel", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "trace-funnel", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "ingestion-key", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "ingestion-key", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "ingestion-limit", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "ingestion-limit", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "notification-channel", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "notification-channel", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "route-policy", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "route-policy", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "apdex-setting", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "quick-filter", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "ttl-setting", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "user-preference", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "logs-field", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "traces-field", "list"},
		// Editor role: create/list replacements from metaresources → metaresource
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "pipeline", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "pipeline", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "planned-maintenance", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "planned-maintenance", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "rule", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "rule", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "saved-view", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "saved-view", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "trace-funnel", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "trace-funnel", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "integration", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "integration", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "ingestion-key", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "ingestion-key", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "ingestion-limit", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "ingestion-limit", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "notification-channel", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "route-policy", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "apdex-setting", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "quick-filter", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "ttl-setting", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "user-preference", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "logs-field", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "traces-field", "list"},
		// Viewer role: create/list replacements from metaresources → metaresource
		{authtypes.SigNozViewerRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "pipeline", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "planned-maintenance", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "rule", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "saved-view", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "trace-funnel", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "integration", "create"},
		{authtypes.SigNozViewerRoleName, "metaresource", "integration", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "notification-channel", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "route-policy", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "apdex-setting", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "quick-filter", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "ttl-setting", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "user-preference", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "logs-field", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "traces-field", "list"},
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
