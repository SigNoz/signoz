package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"slices"
	"time"

	"github.com/oklog/ulid/v2"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type addSpanMapperTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewAddSpanMapperTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_span_mapper_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addSpanMapperTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *addSpanMapperTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addSpanMapperTuples) Up(ctx context.Context, db *bun.DB) error {
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

	tuples := []migrationTuple{
		{"signoz-admin", "metaresource", "span-mapper-group", "read"},
		{"signoz-admin", "metaresource", "span-mapper-group", "update"},
		{"signoz-admin", "metaresource", "span-mapper-group", "delete"},
		{"signoz-admin", "metaresource", "span-mapper-group", "create"},
		{"signoz-admin", "metaresource", "span-mapper-group", "list"},
		{"signoz-admin", "metaresource", "span-mapper-group", "attach"},
		{"signoz-admin", "metaresource", "span-mapper-group", "detach"},
		{"signoz-admin", "metaresource", "span-mapper", "update"},
		{"signoz-admin", "metaresource", "span-mapper", "delete"},
		{"signoz-admin", "metaresource", "span-mapper", "create"},
		{"signoz-editor", "metaresource", "span-mapper-group", "read"},
		{"signoz-editor", "metaresource", "span-mapper-group", "list"},
		{"signoz-viewer", "metaresource", "span-mapper-group", "read"},
		{"signoz-viewer", "metaresource", "span-mapper-group", "list"},
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

	for _, orgID := range orgIDs {
		if err := addManagedRoleTransactionGroups(ctx, tx, orgID, tuples); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addSpanMapperTuples) Down(context.Context, *bun.DB) error {
	return nil
}

type migrationTransactionGroup struct {
	Relation    string               `json:"relation"`
	ObjectGroup migrationObjectGroup `json:"objectGroup"`
}

type migrationObjectGroup struct {
	Resource  migrationObjectResource `json:"resource"`
	Selectors []string                `json:"selectors"`
}

type migrationObjectResource struct {
	Type string `json:"type"`
	Kind string `json:"kind"`
}

// addManagedRoleTransactionGroups merges each tuple as a wildcard grant into its managed role's stored transaction groups.
func addManagedRoleTransactionGroups(ctx context.Context, tx bun.Tx, orgID string, tuples []migrationTuple) error {
	tuplesByRole := make(map[string][]migrationTuple)
	for _, tuple := range tuples {
		tuplesByRole[tuple.roleName] = append(tuplesByRole[tuple.roleName], tuple)
	}

	for roleName, roleTuples := range tuplesByRole {
		var data sql.NullString
		err := tx.NewSelect().
			Table("role").
			Column("transaction_groups").
			Where("org_id = ?", orgID).
			Where("type = ?", "managed").
			Where("name = ?", roleName).
			Scan(ctx, &data)
		if err == sql.ErrNoRows || (err == nil && !data.Valid) {
			continue
		}
		if err != nil {
			return err
		}

		var groups []*migrationTransactionGroup
		if err := json.Unmarshal([]byte(data.String), &groups); err != nil {
			return err
		}

		for _, tuple := range roleTuples {
			index := slices.IndexFunc(groups, func(group *migrationTransactionGroup) bool {
				return group.Relation == tuple.relation && group.ObjectGroup.Resource.Type == tuple.objectType && group.ObjectGroup.Resource.Kind == tuple.objectName
			})
			if index == -1 {
				groups = append(groups, &migrationTransactionGroup{
					Relation:    tuple.relation,
					ObjectGroup: migrationObjectGroup{Resource: migrationObjectResource{Type: tuple.objectType, Kind: tuple.objectName}, Selectors: []string{"*"}},
				})
				continue
			}
			if !slices.Contains(groups[index].ObjectGroup.Selectors, "*") {
				groups[index].ObjectGroup.Selectors = append(groups[index].ObjectGroup.Selectors, "*")
			}
		}

		updated, err := json.Marshal(groups)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Table("role").
			Set("transaction_groups = ?", string(updated)).
			Where("org_id = ?", orgID).
			Where("type = ?", "managed").
			Where("name = ?", roleName).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}
