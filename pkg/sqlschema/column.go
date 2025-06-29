package sqlschema

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

func (column *Column) ToSQL(fmter SQLFormatter) []byte {
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
