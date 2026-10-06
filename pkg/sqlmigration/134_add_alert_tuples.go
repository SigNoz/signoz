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

type addAlertTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewAddAlertTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_alert_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addAlertTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *addAlertTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addAlertTuples) Up(ctx context.Context, db *bun.DB) error {
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
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	isPG := migration.sqlstore.BunDB().Dialect().Name() == dialect.PG

	// rule, planned-maintenance and route-policy moved from role gates to
	// CheckResources, which on enterprise requires real tuples -- existing orgs
	// never had these written, only new orgs get them from the registry at bootstrap.
	writeVerbs := []string{"create", "read", "update", "delete", "list"}
	readVerbs := []string{"read", "list"}

	tuples := make([]migrationTuple, 0, 33)
	for _, objectName := range []string{"rule", "planned-maintenance"} {
		for _, verb := range writeVerbs {
			tuples = append(tuples,
				migrationTuple{authtypes.SigNozAdminRoleName, "metaresource", objectName, verb},
				migrationTuple{authtypes.SigNozEditorRoleName, "metaresource", objectName, verb},
			)
		}
		for _, verb := range readVerbs {
			tuples = append(tuples, migrationTuple{authtypes.SigNozViewerRoleName, "metaresource", objectName, verb})
		}
	}
	for _, verb := range writeVerbs {
		tuples = append(tuples, migrationTuple{authtypes.SigNozAdminRoleName, "metaresource", "route-policy", verb})
	}
	for _, verb := range readVerbs {
		tuples = append(tuples,
			migrationTuple{authtypes.SigNozEditorRoleName, "metaresource", "route-policy", verb},
			migrationTuple{authtypes.SigNozViewerRoleName, "metaresource", "route-policy", verb},
		)
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

func (migration *addAlertTuples) Down(context.Context, *bun.DB) error {
	return nil
}
