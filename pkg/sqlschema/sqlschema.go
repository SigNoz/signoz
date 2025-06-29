package sqlschema

import (
	"context"
)

type SQLSchema interface {
	// Drops a constraint from a table without checking if it exists. The input table needs to exactly match the table without the constraint.
	DropConstraintUnsafe(context.Context, *Table, Constraint) [][]byte

	// Create Index
	CreateIndex(context.Context, Index) [][]byte
}

type SQLFormatter interface {
	// Appends an identifier to the given byte slice.
	AppendIdent(b []byte, ident string) []byte

	// Returns the SQL data type for the given data type.
	SQLDataTypeOf(dataType DataType) string
}
