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

type addServiceAccountAuthz struct {
	sqlstore sqlstore.SQLStore
}

func NewServiceAccountAuthzactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_service_account_authz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addServiceAccountAuthz{sqlstore: sqlstore}, nil
	})
}

func (migration *addServiceAccountAuthz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addServiceAccountAuthz) Up(ctx context.Context, db *bun.DB) error {
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

	type saRoleTuple struct {
		ServiceAccountID string
		OrgID            string
		RoleName         string
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT sa.id, sa.org_id, r.name
		FROM service_account sa
		JOIN service_account_role sar ON sar.service_account_id = sa.id
		JOIN role r ON r.id = sar.role_id
	`)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	defer rows.Close()

	tuples := make([]saRoleTuple, 0)
	for rows.Next() {
		var t saRoleTuple
		if err := rows.Scan(&t.ServiceAccountID, &t.OrgID, &t.RoleName); err != nil {
			return err
		}
		tuples = append(tuples, t)
	}

	for _, t := range tuples {
		entropy := ulid.DefaultEntropy()
		now := time.Now().UTC()
		tupleID := ulid.MustNew(ulid.Timestamp(now), entropy).String()

		objectID := "organization/" + t.OrgID + "/role/" + t.RoleName
		saUserID := "organization/" + t.OrgID + "/serviceaccount/" + t.ServiceAccountID

		if migration.sqlstore.BunDB().Dialect().Name() == dialect.PG {
			result, err := tx.ExecContext(ctx, `
				INSERT INTO tuple (store, object_type, object_id, relation, _user, user_type, ulid, inserted_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (store, object_type, object_id, relation, _user) DO NOTHING`,
				storeID, "role", objectID, "assignee", "serviceaccount:"+saUserID, "user", tupleID, now,
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
				storeID, "role", objectID, "assignee", "serviceaccount:"+saUserID, "TUPLE_OPERATION_WRITE", tupleID, now,
			)
			if err != nil {
				return err
			}
		} else {
			result, err := tx.ExecContext(ctx, `
				INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation) DO NOTHING`,
				storeID, "role", objectID, "assignee", "serviceaccount", saUserID, "", "user", tupleID, now,
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
				storeID, "role", objectID, "assignee", "serviceaccount", saUserID, "", 0, tupleID, now,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (migration *addServiceAccountAuthz) Down(context.Context, *bun.DB) error {
	return nil
}
