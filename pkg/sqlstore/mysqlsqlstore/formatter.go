package mysqlsqlstore

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun/schema"
)

type formatter struct {
	bunf schema.Formatter
}

func newFormatter(dialect schema.Dialect) sqlstore.SQLFormatter {
	return &formatter{bunf: schema.NewFormatter(dialect)}
}

func (f *formatter) JSONExtractString(column, path string) []byte {
	var sql []byte
	sql = append(sql, "json_unquote(json_extract("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, path)
	sql = append(sql, "))"...)
	return sql
}

func (f *formatter) JSONExtractMapValue(column, mapField, key string) []byte {
	escapedKey := strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(key)
	return f.JSONExtractString(column, fmt.Sprintf(`$.%s."%s"`, mapField, escapedKey))
}

func (f *formatter) JSONType(column, path string) []byte {
	var sql []byte
	sql = append(sql, "json_type(json_extract("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, path)
	sql = append(sql, "))"...)
	return sql
}

func (f *formatter) JSONIsArray(column, path string) []byte {
	var sql []byte
	sql = append(sql, f.JSONType(column, path)...)
	sql = append(sql, " = "...)
	sql = schema.Append(f.bunf, sql, "ARRAY")
	return sql
}

func (f *formatter) JSONArrayElements(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	jsonPath := path
	if jsonPath == "" || jsonPath == "$" {
		jsonPath = "$[*]"
	} else {
		jsonPath = jsonPath + "[*]"
	}
	sql = append(sql, "json_table("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, jsonPath)
	sql = append(sql, " columns (value json path '$')) as "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), ".value"...)
}

func (f *formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	jsonPath := path
	if jsonPath == "" || jsonPath == "$" {
		jsonPath = "$[*]"
	} else {
		jsonPath = jsonPath + "[*]"
	}
	sql = append(sql, "json_table("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, jsonPath)
	sql = append(sql, " columns (value text path '$')) as "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), ".value"...)
}

func (f *formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "json_table(json_keys("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "" && path != "$" {
		sql = append(sql, ", "...)
		sql = schema.Append(f.bunf, sql, path)
	}
	sql = append(sql, "), '$[*]' columns (`key` text path '$')) as "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), ".key"...)
}

func (f *formatter) JSONArrayAgg(expression string) []byte {
	var sql []byte
	sql = append(sql, "json_arrayagg("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}

func (f *formatter) JSONArrayLiteral(values ...string) []byte {
	var sql []byte
	sql = append(sql, "json_array("...)
	for idx, value := range values {
		if idx > 0 {
			sql = append(sql, ", "...)
		}
		sql = schema.Append(f.bunf, sql, value)
	}
	sql = append(sql, ')')
	return sql
}

func (f *formatter) TextToJsonColumn(column string) []byte {
	var sql []byte
	sql = append(sql, "cast("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, " as json)"...)
	return sql
}

func (f *formatter) LowerExpression(expression string) []byte {
	var sql []byte
	sql = append(sql, "lower("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}

func (f *formatter) EscapeLikePattern(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}
