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

type addDashboardTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewAddDashboardTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_dashboard_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addDashboardTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *addDashboardTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addDashboardTuples) Up(ctx context.Context, db *bun.DB) error {
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

	// The dashboard and public sharing config routes now authorize per resource,
	// so every org needs the managed-role tuples for both kinds. Orgs
	// bootstrapped before these entries landed in ManagedRoleToTransactions
	// never got them, and migration 063 covered only the anonymous read on
	// public-dashboard.
	tuples := []migrationTuple{
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "read"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "update"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "delete"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "read"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "update"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "delete"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "create"},
		{authtypes.SigNozEditorRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozViewerRoleName, "metaresource", "dashboard", "read"},
		{authtypes.SigNozViewerRoleName, "metaresource", "dashboard", "list"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "read"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "update"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "delete"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "create"},
		{authtypes.SigNozAdminRoleName, "metaresource", "public-dashboard", "list"},
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

	return tx.Commit()
}

func (migration *addDashboardTuples) Down(context.Context, *bun.DB) error {
	return nil
}
