package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"sort"
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

type repairSaFactorKeyWildcards struct {
	sqlstore sqlstore.SQLStore
}

func NewRepairSaFactorKeyWildcardsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("repair_sa_factor_key_wildcards"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &repairSaFactorKeyWildcards{sqlstore: sqlstore}, nil
	})
}

func (migration *repairSaFactorKeyWildcards) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// repairSaFactorKeyTuples derives the wildcard tuples to repair from the
// current managed-role registry, filtered to the three resource/kind pairs
// affected by issue #13016. It mirrors
// ee/authz/openfgaauthz/provider.go:getManagedRoleTransactionTuples which
// resolves each transaction via MustNewResourceFromTypeAndKind and emits
// object "organization/<org>/<kind>/*" with subject
// "role:organization/<org>/role/<role>#assignee".
func repairSaFactorKeyTuples() []migrationTuple {
	allowed := map[string]struct{}{
		"serviceaccount:serviceaccount": {},
		"metaresource:factor-api-key":   {},
		"role:role":                     {},
	}

	tuples := make([]migrationTuple, 0, 19)
	for _, txn := range coretypes.ManagedRoleToTransactions[authtypes.SigNozAdminRoleName] {
		// All managed transactions are wildcard; skip anything per-instance
		// defensively so the repair never creates per-resource object tuples.
		if txn.Object.Selector.String() != coretypes.WildCardSelectorString {
			continue
		}

		key := txn.Object.Resource.Type.StringValue() + ":" + txn.Object.Resource.Kind.String()
		if _, ok := allowed[key]; !ok {
			continue
		}

		tuples = append(tuples, migrationTuple{
			roleName:   authtypes.SigNozAdminRoleName,
			objectType: txn.Object.Resource.Type.StringValue(),
			objectName: txn.Object.Resource.Kind.String(),
			relation:   txn.Verb.StringValue(),
		})
	}

	sort.Slice(tuples, func(i, j int) bool {
		if tuples[i].objectType != tuples[j].objectType {
			return tuples[i].objectType < tuples[j].objectType
		}
		if tuples[i].objectName != tuples[j].objectName {
			return tuples[i].objectName < tuples[j].objectName
		}
		return tuples[i].relation < tuples[j].relation
	})

	return tuples
}

func (migration *repairSaFactorKeyWildcards) Up(ctx context.Context, db *bun.DB) error {
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

	// Service-account and factor-api-key routes moved from legacy AdminAccess
	// gates to CheckResources. Existing organizations missing the wildcard
	// tuples below get GET/read allowed but PUT/DELETE denied; only new
	// organizations receive them from the managed-role registry at bootstrap.
	tuples := repairSaFactorKeyTuples()

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

func (migration *repairSaFactorKeyWildcards) Down(context.Context, *bun.DB) error {
	return nil
}
