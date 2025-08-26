package sqlschema

import (
	"context"

	"github.com/uptrace/bun"
)

type SQLSchema interface {
	// Returns the formatter for the schema.
	Formatter() SQLFormatter

	// Returns the operator for the schema.
	Operator() SQLOperator

	// Inspects the schema and returns the table with the given name.
	GetTable(context.Context, TableName) (*Table, []*UniqueConstraint, error)

	// Inspects the schema and returns the indices for the given table.
	GetIndices(context.Context, TableName) ([]Index, error)

	// Toggles foreign key enforcement for the schema for the current session.
	ToggleFKEnforcement(context.Context, bun.IDB, bool) error
}

// SQLOperator performs operations on a table.
type SQLOperator interface {
	// Returns a list of SQL statements to create a table.
	CreateTable(*Table) [][]byte

	// Returns a list of SQL statements to drop a table.
	DropTable(*Table) [][]byte

	// Returns a list of SQL statements to rename a table.
	RenameTable(*Table, TableName) [][]byte

	// Returns a list of SQL statements to recreate a table.
	RecreateTable(*Table, []*UniqueConstraint) [][]byte

	// Returns a list of SQL statements to create an index.
	CreateIndex(Index) [][]byte

	// Returns a list of SQL statements to drop an index.
	DropIndex(Index) [][]byte

	// Returns a list of SQL statements to add a column to a table.
	// If the column is not nullable, the column is added with the input value, then the column is made non-nullable.
	AddColumn(*Table, []*UniqueConstraint, *Column, any) [][]byte

	// Returns a list of SQL statements to drop a column from a table.
	DropColumn(*Table, *Column) [][]byte

	// Returns a list of SQL statements to drop a constraint from a table.
	DropConstraint(*Table, []*UniqueConstraint, Constraint) [][]byte
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
