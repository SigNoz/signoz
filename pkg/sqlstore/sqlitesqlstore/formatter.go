package sqlitesqlstore

import (
	"github.com/uptrace/bun/schema"
)

type Formatter struct {
	bunf schema.Formatter
}

func NewFormatter(dialect schema.Dialect) *Formatter {
	return &Formatter{bunf: schema.NewFormatter(dialect)}
}

func (f *Formatter) JSONExtractString(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, "json_extract("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", '"...)
	sql = append(sql, path...)
	sql = append(sql, "')"...)
	return sql
}

func (f *Formatter) JSONType(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, "json_type("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", '"...)
	sql = append(sql, path...)
	sql = append(sql, "')"...)
	return sql
}

func (f *Formatter) JSONIsArray(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, f.JSONType(column, path)...)
	sql = append(sql, " = 'array'"...)
	return sql
}

func (f *Formatter) JSONArrayElements(column, path, alias string) ([]byte, []byte) {
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

func (f *Formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
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

func (f *Formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
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

	aliasPath := []byte{}
	aliasPath = f.bunf.AppendIdent(aliasPath, alias+".value")
	return sql, aliasPath
}

func (f *Formatter) JSONArrayAgg(expression string) []byte {
	sql := []byte{}
	sql = append(sql, "json_group_array("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}
func (f *Formatter) JSONArrayLiteral(values ...string) []byte {
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

func (f *Formatter) TextToJsonColumn(column string) []byte {
	sql := []byte{}
	sql = f.bunf.AppendIdent(sql, column)
	return sql
}

func (f *Formatter) Lower(path string) string {
	var result strings.Builder
	result.WriteString("lower(")
	result.WriteString(path)
	result.WriteString(")")
	return result.String()
}
