package postgressqlstore

import (
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
	sql = append(sql, " = "...)
	sql = schema.Append(f.bunf, sql, "array")
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
	sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, append([]byte(alias), "::text"...)
}

func (f *formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "jsonb_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, f.convertJSONPathToPostgresWithMode(path, false)...)
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
	var sql []byte
	sql = append(sql, "jsonb_build_array("...)
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

	var validParts []string
	for _, part := range parts {
		if part != "" {
			validParts = append(validParts, part)
		}
	}

	if len(validParts) == 0 {
		return nil
	}

	var result []byte

	for idx, part := range validParts {
		if idx == len(validParts)-1 {
			if asText {
				result = append(result, "->>"...)
			} else {
				result = append(result, "->"...)
			}
			result = schema.Append(f.bunf, result, part)
			return result
		}

		result = append(result, "->"...)
		result = schema.Append(f.bunf, result, part)
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
