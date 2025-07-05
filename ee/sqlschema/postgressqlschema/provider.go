package postgressqlschema

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun/dialect/pgdialect"
)

type provider struct {
	settings factory.ScopedProviderSettings
	fmtter   sqlschema.SQLFormatter
	sqlstore sqlstore.SQLStore
	tabled   sqlschema.TabledSQLSchema
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("postgres"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config, sqlstore sqlstore.SQLStore) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/postgressqlschema")
	fmtter := Formatter{Formatter: sqlschema.NewFormatter(pgdialect.New())}

	return &provider{
		sqlstore: sqlstore,
		fmtter:   fmtter,
		settings: settings,
		tabled:   newTabled(fmtter),
	}, nil
}

func (provider *provider) Tabled() sqlschema.TabledSQLSchema {
	return provider.tabled
}

func (provider *provider) CreateIndex(ctx context.Context, index sqlschema.Index) ([][]byte, error) {
	return provider.tabled.CreateIndex(index), nil
}

func (provider *provider) DropConstraint(ctx context.Context, tableName sqlschema.TableName, constraint sqlschema.Constraint) ([][]byte, error) {
	sql := [][]byte{}
	sql = append(sql, constraint.ToDropSQL(provider.fmtter, tableName))

	// Postgres typically creates indexes with the convention of `<table_name>_<column_name>_key` if no name is provided.
	sql = append(sql, constraint.OverrideName(fmt.Sprintf("%s_%s_key", tableName, strings.Join(constraint.Columns(), "_"))).ToDropSQL(provider.fmtter, tableName))

	return sql, nil
}

func (provider *provider) AddColumn(ctx context.Context, tableName sqlschema.TableName, column *sqlschema.Column, val any) ([][]byte, error) {
	table, _, _, err := provider.GetTable(ctx, tableName)
	if err != nil {
		return nil, err
	}

	return provider.tabled.AddColumn(table, column, val), nil
}

func (provider *provider) GetTable(ctx context.Context, name sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, []sqlschema.Index, error) {
	rows, err := provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, `
SELECT 
    c.column_name, 
	c.is_nullable = 'YES', 
	c.udt_name, 
	c.column_default 
FROM 
    information_schema.columns AS c
WHERE
    c.table_name = ?`, string(name))
	if err != nil {
		return nil, nil, nil, err
	}

	columns := make([]*sqlschema.Column, 0)
	for rows.Next() {
		var (
			name        string
			sqlDataType string
			nullable    bool
			defaultVal  *string
		)
		if err := rows.Scan(&name, &nullable, &sqlDataType, &defaultVal); err != nil {
			return nil, nil, nil, err
		}

		columnDefault := ""
		if defaultVal != nil {
			columnDefault = *defaultVal
		}

		columns = append(columns, &sqlschema.Column{
			Name:     sqlschema.ColumnName(name),
			Nullable: nullable,
			DataType: provider.fmtter.DataTypeOf(sqlDataType),
			Default:  columnDefault,
		})
	}

	if err := rows.Close(); err != nil {
		return nil, nil, nil, err
	}

	rows, err = provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, `
SELECT 
    c.column_name, 
	constraint_name, 
	constraint_type 
FROM 
    information_schema.table_constraints tc
	JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_catalog, table_name, constraint_name) 
	JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema AND tc.table_name = c.table_name AND ccu.column_name = c.column_name 
WHERE
    c.table_name = ?`, string(name))
	if err != nil {
		return nil, nil, nil, err
	}

	var primaryKeyConstraint *sqlschema.PrimaryKeyConstraint
	uniqueConstraints := make([]*sqlschema.UniqueConstraint, 0)
	for rows.Next() {
		var (
			name           string
			constraintName string
			constraintType string
		)

		if err := rows.Scan(&name, &constraintName, &constraintType); err != nil {
			return nil, nil, nil, err
		}

		if constraintType == "PRIMARY KEY" {
			primaryKeyConstraint = &sqlschema.PrimaryKeyConstraint{
				ColumnNames: []string{name},
			}
		}

		if constraintType == "UNIQUE" {
			uniqueConstraints = append(uniqueConstraints, &sqlschema.UniqueConstraint{
				ColumnNames: []string{name},
			})
		}
	}

	rows, err = provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, `
SELECT 
    tc.constraint_name, 
	kcu.table_name AS referencing_table, 
	kcu.column_name AS referencing_column, 
	ccu.table_name AS referenced_table, 
	ccu.column_name AS referenced_column 
FROM
    information_schema.key_column_usage kcu 
    JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema 
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = ?
	AND kcu.table_name = ?`, "FOREIGN KEY", string(name))
	if err != nil {
		return nil, nil, nil, err
	}

	foreignKeyConstraints := make([]*sqlschema.ForeignKeyConstraint, 0)
	for rows.Next() {
		var (
			constraintName    string
			referencingTable  string
			referencingColumn string
			referencedTable   string
			referencedColumn  string
		)

		if err := rows.Scan(&constraintName, &referencingTable, &referencingColumn, &referencedTable, &referencedColumn); err != nil {
			return nil, nil, nil, err
		}

		foreignKeyConstraints = append(foreignKeyConstraints, &sqlschema.ForeignKeyConstraint{
			ReferencingColumnName: referencingColumn,
			ReferencedTableName:   referencedTable,
			ReferencedColumnName:  referencedColumn,
		})
	}

	if err := rows.Close(); err != nil {
		return nil, nil, nil, err
	}

	rows, err = provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, `
SELECT
    ct.relname AS table_name,
    ci.relname AS index_name,
    i.indisunique AS unique,
    i.indisprimary AS primary,
    a.attname AS column_name
FROM
    pg_index i
    LEFT JOIN pg_class ct ON ct.oid = i.indrelid
    LEFT JOIN pg_class ci ON ci.oid = i.indexrelid
    LEFT JOIN pg_attribute a ON a.attrelid = ct.oid
    LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
WHERE
    a.attnum = ANY(i.indkey)
    AND con.oid IS NULL
    AND ct.relkind = 'r'
    AND ct.relname = ?`, string(name))
	if err != nil {
		return nil, nil, nil, err
	}

	uniqueIndicesMap := make(map[string]*sqlschema.UniqueIndex)
	for rows.Next() {
		var (
			tableName  string
			indexName  string
			unique     bool
			primary    bool
			columnName string
		)

		if err := rows.Scan(&tableName, &indexName, &unique, &primary, &columnName); err != nil {
			return nil, nil, nil, err
		}

		if unique {
			if _, ok := uniqueIndicesMap[indexName]; !ok {
				uniqueIndicesMap[indexName] = &sqlschema.UniqueIndex{
					TableName:   tableName,
					ColumnNames: []string{columnName},
				}
			} else {
				uniqueIndicesMap[indexName].ColumnNames = append(uniqueIndicesMap[indexName].ColumnNames, columnName)
			}
		}
	}

	indices := make([]sqlschema.Index, 0)
	for _, index := range uniqueIndicesMap {
		indices = append(indices, index)
	}

	return &sqlschema.Table{
		Name:                  name,
		Columns:               columns,
		PrimaryKeyConstraint:  primaryKeyConstraint,
		ForeignKeyConstraints: foreignKeyConstraints,
	}, uniqueConstraints, indices, nil
}
