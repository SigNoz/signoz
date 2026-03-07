package sqlschema

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	DataTypeText      = DataType{s: valuer.NewString("TEXT"), z: ""}
	DataTypeBytea     = DataType{s: valuer.NewString("BYTEA"), z: ""}
	DataTypeBigInt    = DataType{s: valuer.NewString("BIGINT"), z: int64(0)}
	DataTypeInteger   = DataType{s: valuer.NewString("INTEGER"), z: int64(0)}
	DataTypeNumeric   = DataType{s: valuer.NewString("NUMERIC"), z: float64(0)}
	DataTypeBoolean   = DataType{s: valuer.NewString("BOOLEAN"), z: false}
	DataTypeTimestamp = DataType{s: valuer.NewString("TIMESTAMP"), z: time.Time{}}
)

type DataType struct {
	s valuer.String
	z any
}

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

func (column *Column) ToAddSQL(fmter SQLFormatter, tableName TableName, ifNotExists bool) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, string(tableName))
	sql = append(sql, " ADD COLUMN "...)
	if ifNotExists {
		sql = append(sql, "IF NOT EXISTS "...)
	}

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

func (column *Column) ToDropSQL(fmter SQLFormatter, tableName TableName, ifExists bool) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, string(tableName))
	sql = append(sql, " DROP COLUMN "...)
	if ifExists {
		sql = append(sql, "IF EXISTS "...)
	}
	sql = fmter.AppendIdent(sql, string(column.Name))

	return sql
}

func (column *Column) ToUpdateSQL(fmter SQLFormatter, tableName TableName, value any) []byte {
	sql := []byte{}

	sql = append(sql, "UPDATE "...)
	sql = fmter.AppendIdent(sql, string(tableName))
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

func (column *Column) ToSetNotNullSQL(fmter SQLFormatter, tableName TableName) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, string(tableName))
	sql = append(sql, " ALTER COLUMN "...)
	sql = fmter.AppendIdent(sql, string(column.Name))
	sql = append(sql, " SET NOT NULL"...)

	return sql
}
