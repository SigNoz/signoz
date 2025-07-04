package sqlschema

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	DataTypeText      = DataType{s: valuer.NewString("TEXT")}
	DataTypeBigInt    = DataType{s: valuer.NewString("BIGINT")}
	DataTypeInteger   = DataType{s: valuer.NewString("INTEGER")}
	DataTypeNumeric   = DataType{s: valuer.NewString("NUMERIC")}
	DataTypeBoolean   = DataType{s: valuer.NewString("BOOLEAN")}
	DataTypeTimestamp = DataType{s: valuer.NewString("TIMESTAMP")}
)

type DataType struct{ s valuer.String }

func (d DataType) String() string {
	return d.s.String()
}

type ColumnName string

type Column struct {
	// The name of the column in the table.
	Name ColumnName

	// The data type of the column. This will be translated to the the appropriate data type as per the dialect.
	DataType DataType

	// Whether the column is nullable.
	Nullable bool

	// The default value of the column.
	Default string
}

func (column *Column) ToDefinitionSQL(fmter SQLFormatter) []byte {
	sql := []byte{}

	sql = fmter.AppendIdent(sql, string(column.Name))
	sql = append(sql, " "...)
	sql = append(sql, fmter.SQLDataTypeOf(column.DataType)...)

	if !column.Nullable {
		sql = append(sql, " NOT NULL"...)
	}

	if column.Default != "" {
		sql = append(sql, " DEFAULT "...)
		sql = append(sql, column.Default...)
	}

	return sql
}

func (column *Column) ToAddSQL(fmter SQLFormatter, tableName string) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, tableName)
	sql = append(sql, " ADD COLUMN "...)

	if column.Default == "" && !column.Nullable {
		adjustedColumn := &Column{
			Name:     column.Name,
			DataType: column.DataType,
			Nullable: true,
			Default:  column.Default,
		}

		sql = append(sql, adjustedColumn.ToDefinitionSQL(fmter)...)
	} else {
		sql = append(sql, column.ToDefinitionSQL(fmter)...)
	}

	return sql
}

func (column *Column) ToUpdateSQL(fmter SQLFormatter, tableName string, value any) []byte {
	sql := []byte{}

	sql = append(sql, "UPDATE "...)
	sql = fmter.AppendIdent(sql, tableName)
	sql = append(sql, " SET "...)
	sql = fmter.AppendIdent(sql, string(column.Name))
	sql = append(sql, " = "...)

	if v, ok := value.(ColumnName); ok {
		sql = fmter.AppendIdent(sql, string(v))
	} else {
		sql = fmter.AppendValue(sql, value)
	}

	return sql
}

func (column *Column) ToSetNotNullSQL(fmter SQLFormatter, tableName string) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, tableName)
	sql = append(sql, " ALTER COLUMN "...)
	sql = fmter.AppendIdent(sql, string(column.Name))
	sql = append(sql, " SET NOT NULL"...)

	return sql
}
