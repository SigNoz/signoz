package sqlschema

import (
	"context"
)

type SQLSchema interface {
	Tabled() TabledSQLSchema

	// Same as Tabled().DropConstraint() but without the table parameter. It inspects the schema to find the table.
	DropConstraint(context.Context, TableName, Constraint) ([][]byte, error)

	// Same as Tabled().CreateIndex() but without the table parameter. It inspects the schema to find the table.
	CreateIndex(context.Context, Index) ([][]byte, error)

	// Same as Tabled().AddColumn() but without the table parameter. It inspects the schema to find the table.
	AddColumn(context.Context, TableName, *Column, any) ([][]byte, error)

	// Inspects the schema and returns the table with the given name.
	GetTable(context.Context, TableName) (*Table, []*UniqueConstraint, []Index, error)
}

type TabledSQLSchema interface {
	// Returns a list of SQL statements to drop a constraint from a table.
	DropConstraint(*Table, []*UniqueConstraint, Constraint) [][]byte

	// Returns a list of SQL statements to create an index.
	CreateIndex(Index) [][]byte

	// Returns a list of SQL statements to add a column to a table.
	// If the column is not nullable, the column is added with the input value, then the column is made non-nullable.
	AddColumn(*Table, *Column, any) [][]byte
}

type SQLFormatter interface {
	// Returns the SQL data type for the given data type.
	SQLDataTypeOf(DataType) string

	// Returns the data type for the given SQL data type.
	DataTypeOf(string) DataType

	// Appends an identifier to the given byte slice.
	AppendIdent([]byte, string) []byte

	// Appends a value to the given byte slice.
	AppendValue([]byte, any) []byte
}
