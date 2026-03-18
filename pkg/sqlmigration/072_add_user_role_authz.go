package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type addUserRoleAuthz struct {
	sqlstore sqlstore.SQLStore
}

func NewAddUserRoleAuthzFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_user_role_authz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addUserRoleAuthz{sqlstore: sqlstore}, nil
	})
}

func (migration *addUserRoleAuthz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addUserRoleAuthz) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var storeID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM store WHERE name = ? LIMIT 1`, "signoz").Scan(&storeID)
	if err != nil {
		return err
	}

	type userRoleTuple struct {
		UserID   string
		OrgID    string
		RoleName string
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT u.id, u.org_id, r.name
		FROM users u
		JOIN user_role ur ON ur.user_id = u.id
		JOIN role r ON r.id = ur.role_id
		WHERE u.status != 'deleted'
	`)
	if err != nil {
		if err == sql.ErrNoRows {
			return tx.Commit()
		}
		return err
	}
	defer rows.Close()

	tuples := make([]userRoleTuple, 0)
	for rows.Next() {
		var t userRoleTuple
		if err := rows.Scan(&t.UserID, &t.OrgID, &t.RoleName); err != nil {
			return err
		}
		tuples = append(tuples, t)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	entropy := ulid.DefaultEntropy()
	for _, t := range tuples {
		now := time.Now().UTC()
		tupleID := ulid.MustNew(ulid.Timestamp(now), entropy).String()

		objectID := "organization/" + t.OrgID + "/role/" + t.RoleName
		userID := "organization/" + t.OrgID + "/user/" + t.UserID

		if migration.sqlstore.BunDB().Dialect().Name() == dialect.PG {
			result, err := tx.ExecContext(ctx, `
				INSERT INTO tuple (store, object_type, object_id, relation, _user, user_type, ulid, inserted_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (store, object_type, object_id, relation, _user) DO NOTHING`,
				storeID, "role", objectID, "assignee", "user:"+userID, "user", tupleID, now,
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
				storeID, "role", objectID, "assignee", "user:"+userID, "TUPLE_OPERATION_WRITE", tupleID, now,
			)
			if err != nil {
				return err
			}
		} else {
			result, err := tx.ExecContext(ctx, `
				INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation) DO NOTHING`,
				storeID, "role", objectID, "assignee", "user", userID, "", "user", tupleID, now,
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
				storeID, "role", objectID, "assignee", "user", userID, "", 0, tupleID, now,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (migration *addUserRoleAuthz) Down(context.Context, *bun.DB) error {
	return nil
}
