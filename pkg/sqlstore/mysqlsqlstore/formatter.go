package mysqlsqlstore

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
	sql = append(sql, "JSON_EXTRACT("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, path)
	sql = append(sql, ")"...)
	return sql
}

func (f *formatter) JSONType(column, path string) []byte {
	// MySQL JSON_TYPE takes a single JSON expression, so we must wrap JSON_EXTRACT.
	var sql []byte
	sql = append(sql, "JSON_TYPE("...)
	sql = append(sql, f.JSONExtractString(column, path)...)
	sql = append(sql, ")"...)
	return sql
}

func (f *formatter) JSONIsArray(column, path string) []byte {
	var sql []byte
	sql = append(sql, f.JSONType(column, path)...)
	sql = append(sql, " = "...)
	// MySQL JSON_TYPE returns the string 'ARRAY' for arrays.
	sql = schema.Append(f.bunf, sql, "ARRAY")
	return sql
}

func (f *formatter) JSONArrayElements(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	sql = append(sql, "JSON_TABLE("...)
	sql = f.bunf.AppendIdent(sql, column)

	// Ensure the JSON path iterates over array elements by appending [*].
	basePath := strings.TrimSpace(path)
	if basePath == "" || basePath == "$" {
		basePath = "$"
	}
	if !strings.HasPrefix(basePath, "$") {
		basePath = "$." + basePath
	}
	if !strings.HasSuffix(basePath, "[*]") {
		basePath = basePath + "[*]"
	}

	sql = append(sql, ", "...)
	sql = schema.Append(f.bunf, sql, basePath)

	// Expose each element as a column named `value`.
	sql = append(sql, " COLUMNS(value JSON PATH \"$\")) AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	// Return the qualified value column to match other dialects (e.g., alias.value).
	return sql, append([]byte(alias), ".value"...)
}

func (f *formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
	// For initial MySQL support, reuse JSONArrayElements; callers can cast as needed.
	return f.JSONArrayElements(column, path, alias)
}

func (f *formatter) JSONArrayAgg(expression string) []byte {
	var sql []byte
	sql = append(sql, "JSON_ARRAYAGG("...)
	sql = append(sql, expression...)
	sql = append(sql, ")"...)
	return sql
}

func (f *formatter) JSONArrayLiteral(values ...string) []byte {
	var sql []byte
	sql = append(sql, "JSON_ARRAY("...)
	for idx, value := range values {
		if idx > 0 {
			sql = append(sql, ", "...)
		}
		sql = schema.Append(f.bunf, sql, value)
	}
	sql = append(sql, ")"...)
	return sql
}

func (f *formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	var sql []byte
	// Use JSON_TABLE over JSON_KEYS(...) to produce one row per key, similar to sqlite/json_each.
	sql = append(sql, "JSON_TABLE("...)
	// JSON_KEYS(column[, path]) returns a JSON array of keys.
	sql = append(sql, "JSON_KEYS("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, ", "...)
		sql = schema.Append(f.bunf, sql, path)
	}
	sql = append(sql, "), '$[*]' COLUMNS(key VARCHAR(255) PATH '$')) AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	// Expose the key column as alias.key to match other dialects.
	return sql, append([]byte(alias), ".key"...)
}

func (f *formatter) TextToJsonColumn(column string) []byte {
	var sql []byte
	sql = append(sql, "CAST("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, " AS JSON)"...)
	return sql
}

func (f *formatter) LowerExpression(expression string) []byte {
	var sql []byte
	sql = append(sql, "LOWER("...)
	sql = append(sql, expression...)
	sql = append(sql, ")"...)
	return sql
}


