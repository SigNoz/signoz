package sqlstoretest

import (
	"github.com/uptrace/bun/schema"
)

type formatter struct {
	bunf schema.Formatter
}

func (f *formatter) JSONExtractString(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, "json_extract("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", '"...)
	sql = append(sql, path...)
	sql = append(sql, "')"...)
	return sql
}

func (f *formatter) JSONType(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, "json_type("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", '"...)
	sql = append(sql, path...)
	sql = append(sql, "')"...)
	return sql
}

func (f *formatter) JSONIsArray(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, f.JSONType(column, path)...)
	sql = append(sql, " = 'array'"...)
	return sql
}

func (f *formatter) JSONArrayElements(column, path, alias string) ([]byte, []byte) {
	sql := []byte{}
	sql = append(sql, "json_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, ", '"...)
		sql = append(sql, path...)
		sql = append(sql, "'"...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	valuePath := []byte{}
	valuePath = f.bunf.AppendIdent(valuePath, alias+".value")
	return sql, valuePath
}

func (f *formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
	sql := []byte{}
	sql = append(sql, "json_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, ", '"...)
		sql = append(sql, path...)
		sql = append(sql, "'"...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	valuePath := []byte{}
	valuePath = f.bunf.AppendIdent(valuePath, alias+".value")
	return sql, valuePath
}

func (f *formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	sql := []byte{}
	sql = append(sql, "json_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, ", '"...)
		sql = append(sql, path...)
		sql = append(sql, "'"...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)
	return sql
}

func (f *formatter) JSONArrayAgg(expression string) []byte {
	sql := []byte{}
	sql = append(sql, "json_group_array("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}

func (f *formatter) JSONArrayLiteral(values ...string) []byte {
	if len(values) == 0 {
		return []byte("json_array()")
	}
	sql := []byte{}
	sql = append(sql, "json_array("...)
	for i, v := range values {
		if i > 0 {
			sql = append(sql, ", "...)
		}
		sql = append(sql, '\'')
		sql = append(sql, v...)
		sql = append(sql, '\'')
	}
	sql = append(sql, ')')
	return sql
}

func (f *formatter) TextToJsonColumn(column string) []byte {
	sql := []byte{}
	sql = f.bunf.AppendIdent(sql, column)
	return sql
}

func (f *formatter) Lower(path string) string {
	var result strings.Builder
	result.WriteString("lower(")
	result.WriteString(path)
	result.WriteString(")")
	return result.String()
}
