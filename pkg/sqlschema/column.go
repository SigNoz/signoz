package sqlschema

import "github.com/SigNoz/signoz/pkg/valuer"

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

type Column struct {
	// The name of the column in the table.
	Name string

	// The data type of the column. This will be translated to the the appropriate data type as per the dialect.
	DataType DataType

	// Whether the column is nullable.
	Nullable bool

	// The default value of the column.
	Default string
}

func (column *Column) ToDefinitionSQL(fmter SQLFormatter) []byte {
	sql := []byte{}

	sql = fmter.AppendIdent(sql, column.Name)
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
