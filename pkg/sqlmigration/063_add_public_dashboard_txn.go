package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type addAnonymousPublicDashboardTransaction struct {
	sqlstore sqlstore.SQLStore
}

func NewAddAnonymousPublicDashboardTransactionFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_public_dashboard_txn"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddAnonymousPublicDashboardTransaction(ctx, ps, c, sqlstore)
	})
}

func newAddAnonymousPublicDashboardTransaction(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addAnonymousPublicDashboardTransaction{
		sqlstore: sqlstore,
	}, nil
}

func (migration *addAnonymousPublicDashboardTransaction) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAnonymousPublicDashboardTransaction) Up(ctx context.Context, db *bun.DB) error {
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

	// fetch all the orgs for which we need to insert the anonymous public dashboard transaction tuple.
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

	for _, orgID := range orgIDs {
		// based on openfga tuple and changelog id's are same for writes.
		// ref: https://github.com/openfga/openfga/blob/main/pkg/storage/sqlite/sqlite.go#L467
		entropy := ulid.DefaultEntropy()
		now := time.Now().UTC()
		tupleID := ulid.MustNew(ulid.Timestamp(now), entropy).String()

		// Add wildcard (*) transaction for signoz-anonymous role to read all public-dashboards
		// This grants the signoz-anonymous role read access to all public dashboards in the organization
		if migration.sqlstore.BunDB().Dialect().Name() == dialect.PG {
			result, err := tx.ExecContext(ctx, `
			INSERT INTO tuple (store, object_type, object_id, relation, _user, user_type, ulid, inserted_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (store, object_type, object_id, relation, _user) DO NOTHING`,
				storeID, "metaresource", "organization/"+orgID+"/public-dashboard/*", "read", "role:organization/"+orgID+"/role/"+roletypes.SigNozAnonymousRoleName+"#assignee", "userset", tupleID, now,
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
				storeID, "metaresource", "organization/"+orgID+"/public-dashboard/*", "read", "role:organization/"+orgID+"/role/"+roletypes.SigNozAnonymousRoleName+"#assignee", "TUPLE_OPERATION_WRITE", tupleID, now,
			)
			if err != nil {
				return err
			}

		} else {
			result, err := tx.ExecContext(ctx, `
			INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation) DO NOTHING`,
				storeID, "metaresource", "organization/"+orgID+"/public-dashboard/*", "read", "role", "organization/"+orgID+"/role/"+roletypes.SigNozAnonymousRoleName, "assignee", "userset", tupleID, now,
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
				storeID, "metaresource", "organization/"+orgID+"/public-dashboard/*", "read", "role", "organization/"+orgID+"/role/"+roletypes.SigNozAnonymousRoleName, "assignee", 0, tupleID, now,
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

func (migration *addAnonymousPublicDashboardTransaction) Down(context.Context, *bun.DB) error {
	return nil
}
