package postgressqlschema

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
)

type provider struct {
	settings factory.ScopedProviderSettings
	fmter    sqlschema.SQLFormatter
	sqlstore sqlstore.SQLStore
	operator sqlschema.SQLOperator
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("postgres"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config, sqlstore sqlstore.SQLStore) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/postgressqlschema")
	fmter := Formatter{Formatter: sqlschema.NewFormatter(sqlstore.BunDB().Dialect())}

	return &provider{
		sqlstore: sqlstore,
		fmter:    fmter,
		settings: settings,
		operator: sqlschema.NewOperator(fmter, sqlschema.OperatorSupport{
			DropConstraint:          true,
			ColumnIfNotExistsExists: true,
			AlterColumnSetNotNull:   true,
		}),
	}, nil
}

func (provider *provider) Formatter() sqlschema.SQLFormatter {
	return provider.fmter
}

func (provider *provider) Operator() sqlschema.SQLOperator {
	return provider.operator
}

func (provider *provider) GetTable(ctx context.Context, tableName sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, error) {
	columns := []struct {
		ColumnName  string  `bun:"column_name"`
		Nullable    bool    `bun:"nullable"`
		SQLDataType string  `bun:"udt_name"`
		DefaultVal  *string `bun:"column_default"`
	}{}

	err := provider.
		sqlstore.
		BunDB().
		NewRaw(`
SELECT 
    c.column_name, 
	c.is_nullable = 'YES' as nullable, 
	c.udt_name, 
	c.column_default 
FROM 
    information_schema.columns AS c
WHERE
    c.table_name = ?`, string(tableName)).
		Scan(ctx, &columns)
	if err != nil {
		return nil, nil, err
	}
	if len(columns) == 0 {
		return nil, nil, sql.ErrNoRows
	}

	sqlschemaColumns := make([]*sqlschema.Column, 0)
	for _, column := range columns {
		columnDefault := ""
		if column.DefaultVal != nil {
			columnDefault = *column.DefaultVal
		}

		sqlschemaColumns = append(sqlschemaColumns, &sqlschema.Column{
			Name:     sqlschema.ColumnName(column.ColumnName),
			Nullable: column.Nullable,
			DataType: provider.fmter.DataTypeOf(column.SQLDataType),
			Default:  columnDefault,
		})
	}

	constraintsRows, err := provider.
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
    c.table_name = ?`, string(tableName))
	if err != nil {
		return nil, nil, err
	}

	defer func() {
		if err := constraintsRows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", "error", err)
		}
	}()

	var primaryKeyConstraint *sqlschema.PrimaryKeyConstraint
	uniqueConstraintsMap := make(map[string]*sqlschema.UniqueConstraint)
	for constraintsRows.Next() {
		var (
			name           string
			constraintName string
			constraintType string
		)

		if err := constraintsRows.Scan(&name, &constraintName, &constraintType); err != nil {
			return nil, nil, err
		}

		if constraintType == "PRIMARY KEY" {
			if primaryKeyConstraint == nil {
				primaryKeyConstraint = (&sqlschema.PrimaryKeyConstraint{
					ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName(name)},
				}).Named(constraintName).(*sqlschema.PrimaryKeyConstraint)
			} else {
				primaryKeyConstraint.ColumnNames = append(primaryKeyConstraint.ColumnNames, sqlschema.ColumnName(name))
			}
		}

		if constraintType == "UNIQUE" {
			if _, ok := uniqueConstraintsMap[constraintName]; !ok {
				uniqueConstraintsMap[constraintName] = (&sqlschema.UniqueConstraint{
					ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName(name)},
				}).Named(constraintName).(*sqlschema.UniqueConstraint)
			} else {
				uniqueConstraintsMap[constraintName].ColumnNames = append(uniqueConstraintsMap[constraintName].ColumnNames, sqlschema.ColumnName(name))
			}
		}
	}

	foreignKeyConstraintsRows, err := provider.
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
	AND kcu.table_name = ?`, "FOREIGN KEY", string(tableName))
	if err != nil {
		return nil, nil, err
	}

	defer func() {
		if err := foreignKeyConstraintsRows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", "error", err)
		}
	}()

	foreignKeyConstraints := make([]*sqlschema.ForeignKeyConstraint, 0)
	for foreignKeyConstraintsRows.Next() {
		var (
			constraintName    string
			referencingTable  string
			referencingColumn string
			referencedTable   string
			referencedColumn  string
		)

		if err := foreignKeyConstraintsRows.Scan(&constraintName, &referencingTable, &referencingColumn, &referencedTable, &referencedColumn); err != nil {
			return nil, nil, err
		}

		foreignKeyConstraints = append(foreignKeyConstraints, (&sqlschema.ForeignKeyConstraint{
			ReferencingColumnName: sqlschema.ColumnName(referencingColumn),
			ReferencedTableName:   sqlschema.TableName(referencedTable),
			ReferencedColumnName:  sqlschema.ColumnName(referencedColumn),
		}).Named(constraintName).(*sqlschema.ForeignKeyConstraint))
	}

	uniqueConstraints := make([]*sqlschema.UniqueConstraint, 0)
	for _, uniqueConstraint := range uniqueConstraintsMap {
		uniqueConstraints = append(uniqueConstraints, uniqueConstraint)
	}

	return &sqlschema.Table{
		Name:                  tableName,
		Columns:               sqlschemaColumns,
		PrimaryKeyConstraint:  primaryKeyConstraint,
		ForeignKeyConstraints: foreignKeyConstraints,
	}, uniqueConstraints, nil
}

func (provider *provider) GetIndices(ctx context.Context, name sqlschema.TableName) ([]sqlschema.Index, error) {
	rows, err := provider.
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
		return nil, err
	}

	defer func() {
		if err := rows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", "error", err)
		}
	}()

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
			return nil, err
		}

		if unique {
			if _, ok := uniqueIndicesMap[indexName]; !ok {
				uniqueIndicesMap[indexName] = &sqlschema.UniqueIndex{
					TableName:   name,
					ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName(columnName)},
				}
			} else {
				uniqueIndicesMap[indexName].ColumnNames = append(uniqueIndicesMap[indexName].ColumnNames, sqlschema.ColumnName(columnName))
			}
		}
	}

	indices := make([]sqlschema.Index, 0)
	for _, index := range uniqueIndicesMap {
		indices = append(indices, index)
	}

	return indices, nil
}

func (provider *provider) ToggleFKEnforcement(_ context.Context, _ bun.IDB, _ bool) error {
	return nil
}
