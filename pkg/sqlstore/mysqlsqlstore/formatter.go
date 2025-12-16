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
	if path != "$" && path != "" {
		sql = append(sql, ", "...)
		sql = schema.Append(f.bunf, sql, path)
	} else {
		sql = append(sql, ", "...)
		sql = schema.Append(f.bunf, sql, "$")
	}
	sql = append(sql, " COLUMNS("...)
	sql = f.bunf.AppendIdent(sql, alias)
	sql = append(sql, " JSON PATH \"$\")) AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, []byte(alias)
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
	sql = append(sql, "JSON_KEYS("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, ", "...)
		sql = schema.Append(f.bunf, sql, path)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	return sql, []byte(alias)
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


