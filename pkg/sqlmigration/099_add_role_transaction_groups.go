package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type addRoleTransactionGroups struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddRoleTransactionGroupsFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_role_transaction_groups"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addRoleTransactionGroups{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *addRoleTransactionGroups) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addRoleTransactionGroups) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	table, _, err := migration.sqlschema.GetTable(ctx, "role")
	if err != nil {
		return err
	}

	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("transaction_groups"),
		DataType: sqlschema.DataTypeText,
		Nullable: true,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, nil, column, nil)
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	var storeID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM store WHERE name = ? LIMIT 1`, "signoz").Scan(&storeID)
	if err != nil {
		return err
	}

	type customRole struct {
		id    string
		name  string
		orgID string
	}

	var customRoles []customRole
	rows, err := tx.QueryContext(ctx, `SELECT id, name, org_id FROM role WHERE type = ? AND transaction_groups IS NULL`, authtypes.RoleTypeCustom.StringValue())
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var role customRole
		if err := rows.Scan(&role.id, &role.name, &role.orgID); err != nil {
			return err
		}
		customRoles = append(customRoles, role)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	isPG := migration.sqlstore.BunDB().Dialect().Name() == dialect.PG

	for _, role := range customRoles {
		roleSubject := "organization/" + role.orgID + "/role/" + role.name

		var tupleRows *sql.Rows
		if isPG {
			tupleRows, err = tx.QueryContext(ctx, `
				SELECT object_type, object_id, relation FROM tuple
				WHERE store = ? AND _user = ?`,
				storeID, "role:"+roleSubject+"#assignee",
			)
		} else {
			tupleRows, err = tx.QueryContext(ctx, `
				SELECT object_type, object_id, relation FROM tuple
				WHERE store = ? AND user_object_type = ? AND user_object_id = ? AND user_relation = ?`,
				storeID, "role", roleSubject, "assignee",
			)
		}
		if err != nil {
			return err
		}

		tuples := make([]*openfgav1.TupleKey, 0)
		for tupleRows.Next() {
			var objectType, objectID, relation string
			if err := tupleRows.Scan(&objectType, &objectID, &relation); err != nil {
				tupleRows.Close()
				return err
			}
			tuples = append(tuples, &openfgav1.TupleKey{Object: objectType + ":" + objectID, Relation: relation})
		}
		if err := tupleRows.Err(); err != nil {
			tupleRows.Close()
			return err
		}
		tupleRows.Close()

		groups := authtypes.MustNewTransactionGroupsFromTuples(tuples)
		data, err := json.Marshal(groups)
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, `UPDATE role SET transaction_groups = ? WHERE id = ?`, string(data), role.id); err != nil {
			return err
		}
	}

	for roleName, transactions := range coretypes.ManagedRoleToTransactions {
		groups := authtypes.NewTransactionGroupsFromTransactions(transactions)
		data, err := json.Marshal(groups)
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, `UPDATE role SET transaction_groups = ? WHERE type = ? AND name = ?`, string(data), authtypes.RoleTypeManaged.StringValue(), roleName); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addRoleTransactionGroups) Down(context.Context, *bun.DB) error {
	return nil
}
