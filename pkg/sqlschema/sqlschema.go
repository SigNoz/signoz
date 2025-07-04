package sqlschema

import (
	"context"
)

type SQLSchema interface {
	// Returns a list of SQL statements to drop a constraint from a table.
	// Unsafe might fail if the input table does not exactly match the table without the constraint.
	// Safe would be to inspect the table and find out the original table definition. This is not implemented yet.
	DropConstraintUnsafe(context.Context, *Table, Constraint) [][]byte

	// Returns a list of SQL statements to create an index.
	CreateIndex(context.Context, Index) [][]byte

	// Adds a column to a table. If the column is not nullable, the column is added with the input value, then the column is made non-nullable.
	// Unsafe might fail if the input table does not exactly match the existing table.
	// Safe would be to inspect the table and find out the original table definition. This is not implemented yet.
	AddColumnUnsafe(context.Context, *Table, *Column, any) [][]byte
}

type SQLFormatter interface {
	// Appends an identifier to the given byte slice.
	AppendIdent(b []byte, ident string) []byte

	// Appends a value to the given byte slice.
	AppendValue(b []byte, v any) []byte

	// Returns the SQL data type for the given data type.
	SQLDataTypeOf(dataType DataType) string
}
