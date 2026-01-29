package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type migrateRbacToAuthz struct {
	sqlstore sqlstore.SQLStore
}

var (
	existingRoleToSigNozManagedRoleMap = map[string]string{
		"ADMIN":  "signoz-admin",
		"EDITOR": "signoz-editor",
		"VIEWER": "signoz-viewer",
	}
)

func NewMigrateRbacToAuthzFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_rbac_to_authz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newMigrateRbacToAuthz(ctx, ps, c, sqlstore)
	})
}

func newMigrateRbacToAuthz(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &migrateRbacToAuthz{
		sqlstore: sqlstore,
	}, nil
}

func (migration *migrateRbacToAuthz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *migrateRbacToAuthz) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// for upgrades from version where authz service wasn't introduced the store won't be present, hence we need to ensure store exists.
	var storeID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM store WHERE name = ? LIMIT 1`, "signoz").Scan(&storeID)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if storeID == "" {
		// based on openfga ids to avoid any scan issues.
		// ref: https://github.com/openfga/openfga/blob/main/pkg/server/commands/create_store.go#L45
		storeID = ulid.Make().String()
		_, err := tx.ExecContext(ctx, `INSERT INTO store (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`, storeID, "signoz", time.Now().UTC(), time.Now().UTC())
		if err != nil {
			return err
		}
	}

	// fetch all the orgs for which we need to insert user role grant tuples.
	orgIDs := []string{}
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

	type tuple struct {
		OrgID    string
		Type     string
		ID       string
		RoleName string
	}
	tuples := []tuple{}

	for _, orgID := range orgIDs {
		userRows, err := tx.QueryContext(ctx, `
			SELECT id, role FROM users WHERE org_id = ?`, orgID)
		if err != nil {
			return err
		}
		defer userRows.Close()

		for userRows.Next() {
			var id, role string
			if err := userRows.Scan(&id, &role); err != nil {
				return err
			}

			managedRole, ok := existingRoleToSigNozManagedRoleMap[role]
			if !ok {
				return errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid role assignment: %s for user_id: %s", role, id)
			}
			tuples = append(tuples, tuple{
				OrgID:    orgID,
				ID:       id,
				Type:     "user",
				RoleName: managedRole,
			})
		}

		tuples = append(tuples, tuple{
			OrgID:    orgID,
			ID:       authtypes.AnonymousUser.StringValue(),
			Type:     "anonymous",
			RoleName: "signoz-anonymous",
		})

	}

	_, err = tx.ExecContext(ctx, `DELETE FROM tuple`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM changelog`)
	if err != nil {
		return err
	}

	for _, tuple := range tuples {
		// based on openfga tuple and changelog id's are same for writes.
		// ref: https://github.com/openfga/openfga/blob/main/pkg/storage/sqlite/sqlite.go#L467
		entropy := ulid.DefaultEntropy()
		now := time.Now().UTC()
		tupleID := ulid.MustNew(ulid.Timestamp(now), entropy).String()

		if migration.sqlstore.BunDB().Dialect().Name() == dialect.PG {
			result, err := tx.ExecContext(ctx, `
			INSERT INTO tuple (store, object_type, object_id, relation, _user, user_type, ulid, inserted_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (store, object_type, object_id, relation, _user) DO NOTHING`,
				storeID, "role", "organization/"+tuple.OrgID+"/role/"+tuple.RoleName, "assignee", tuple.Type+":organization/"+tuple.OrgID+"/"+tuple.Type+"/"+tuple.ID, "user", tupleID, now,
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
				storeID, "role", "organization/"+tuple.OrgID+"/role/"+tuple.RoleName, "assignee", tuple.Type+":organization/"+tuple.OrgID+"/"+tuple.Type+"/"+tuple.ID, "TUPLE_OPERATION_WRITE", tupleID, now,
			)
			if err != nil {
				return err
			}

		} else {
			result, err := tx.ExecContext(ctx, `
			INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation) DO NOTHING`,
				storeID, "role", "organization/"+tuple.OrgID+"/role/"+tuple.RoleName, "assignee", tuple.Type, "organization/"+tuple.OrgID+"/"+tuple.Type+"/"+tuple.ID, "", "user", tupleID, now,
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
				storeID, "role", "organization/"+tuple.OrgID+"/role/"+tuple.RoleName, "assignee", tuple.Type, "organization/"+tuple.OrgID+"/"+tuple.Type+"/"+tuple.ID, "", 0, tupleID, now,
			)
			if err != nil {
				return err
			}
		}

	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *migrateRbacToAuthz) Down(context.Context, *bun.DB) error {
	return nil
}
