package postgressqlstore

import (
	"reflect"
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
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, f.convertJSONPathToPostgres(path)...)
	return sql
}

func (f *formatter) JSONType(column, path string) []byte {
	var sql []byte
	sql = append(sql, "jsonb_typeof("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
	sql = append(sql, ')')
	return sql
}

func (f *formatter) JSONIsArray(column, path string) []byte {
	var sql []byte
	sql = append(sql, f.JSONType(column, path)...)
	sql = append(sql, " = 'array'"...)
	return sql
}

func (f *formatter) JSONArrayElements(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "jsonb_array_elements("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, []byte(alias)
}

func (f *formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "jsonb_array_elements_text("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), "::text"...)
}

func (f *formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "jsonb_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), ".key"...)
}

func (f *formatter) JSONArrayAgg(expression string) []byte {
	var sql []byte
	sql = append(sql, "jsonb_agg("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}

func (f *formatter) JSONArrayLiteral(values ...string) []byte {
	if len(values) == 0 {
		return []byte("jsonb_build_array()")
	}
	var sql []byte
	sql = append(sql, "jsonb_build_array("...)
	for i, v := range values {
		if i > 0 {
			sql = append(sql, ", "...)
		}
		sql = f.bunf.AppendValue(sql, reflect.ValueOf(v))
	}
	sql = append(sql, ')')
	return sql
}

func (f *formatter) TextToJsonColumn(column string) []byte {
	var sql []byte
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, "::jsonb"...)
	return sql
}

func (f *formatter) convertJSONPathToPostgres(jsonPath string) []byte {
	return f.convertJSONPathToPostgresWithMode(jsonPath, true)
}

func (f *formatter) convertJSONPathToPostgresWithMode(jsonPath string, asText bool) []byte {
	path := strings.TrimPrefix(strings.TrimPrefix(jsonPath, "$"), ".")

	if path == "" {
		return nil
	}

	parts := strings.Split(path, ".")
	if len(parts) == 0 {
		return nil
	}

	var result []byte

	for i, part := range parts {
		if i == len(parts)-1 {
			if asText {
				result = append(result, "->>"...)
			} else {
				result = append(result, "->"...)
			}
			result = append(result, '\'')
			result = append(result, part...)
			result = append(result, '\'')
			return result
		}

		result = append(result, "->"...)
		result = append(result, '\'')
		result = append(result, part...)
		result = append(result, '\'')
	}

	return result
}

func (f *formatter) LowerExpression(expression string) []byte {
	var sql []byte
	sql = append(sql, "lower("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}
