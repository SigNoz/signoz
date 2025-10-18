package postgressqlschema

import (
	"context"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
)

var (
	columnDefaultValuePattern = regexp.MustCompile(`^(.*?)(?:::.*)?$`)
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
			SCreateAndDropConstraint:                        true,
			SAlterTableAddAndDropColumnIfNotExistsAndExists: true,
			SAlterTableAlterColumnSetAndDrop:                true,
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
    c.table_name = ?`, string(tableName))
	if err != nil {
		return nil, nil, provider.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "table (%s) not found", tableName)
	}

	defer func() {
		if err := rows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", "error", err)
		}
	}()

	columns := make([]*sqlschema.Column, 0)
	for rows.Next() {
		var (
			name        string
			sqlDataType string
			nullable    bool
			defaultVal  *string
		)
		if err := rows.Scan(&name, &nullable, &sqlDataType, &defaultVal); err != nil {
			return nil, nil, err
		}

		columnDefault := ""
		if defaultVal != nil {
			columnDefault = columnDefaultValuePattern.ReplaceAllString(*defaultVal, "$1")
		}

		columns = append(columns, &sqlschema.Column{
			Name:     sqlschema.ColumnName(name),
			Nullable: nullable,
			DataType: provider.fmter.DataTypeOf(sqlDataType),
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
		Columns:               columns,
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
    a.attname AS column_name,
    array_position(i.indkey, a.attnum) AS column_position
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
    AND ct.relname = ?
ORDER BY index_name, column_position`, string(name))
	if err != nil {
		return nil, provider.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "no indices for table (%s) found", name)
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
			// starts from 0 and is unused in this function, this is to ensure that the column names are in the correct order
			columnPosition int
		)

		if err := rows.Scan(&tableName, &indexName, &unique, &primary, &columnName, &columnPosition); err != nil {
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
	for indexName, index := range uniqueIndicesMap {
		if index.Name() == indexName {
			indices = append(indices, index)
		} else {
			indices = append(indices, index.Named(indexName))
		}
	}

	return indices, nil
}

func (provider *provider) ToggleFKEnforcement(_ context.Context, _ bun.IDB, _ bool) error {
	return nil
}
