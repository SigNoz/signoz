package postgressqlstore

import (
	"strings"

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
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, convertJSONPathToPostgres(path)...)
	return sql
}

func (f *Formatter) JSONType(column, path string) []byte {
	sql := []byte{}
	sql = append(sql, "jsonb_typeof("...)
	sql = f.bunf.AppendIdent(sql, column)
	sql = append(sql, convertJSONPathToPostgresWithMode(path, false)...)
	sql = append(sql, ')')
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
	sql = append(sql, "jsonb_array_elements("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, convertJSONPathToPostgresWithMode(path, false)...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	aliasBytes := []byte{}
	aliasBytes = f.bunf.AppendIdent(aliasBytes, alias)
	return sql, aliasBytes
}

func (f *Formatter) JSONArrayOfStrings(column, path, alias string) ([]byte, []byte) {
	sql := []byte{}
	sql = append(sql, "jsonb_array_elements_text("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, convertJSONPathToPostgresWithMode(path, false)...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	aliasBytes := []byte{}
	aliasBytes = f.bunf.AppendIdent(aliasBytes, alias)
	aliasBytes = append(aliasBytes, "::text"...)
	return sql, aliasBytes
}

func (f *Formatter) JSONKeys(column, path, alias string) ([]byte, []byte) {
	sql := []byte{}
	sql = append(sql, "jsonb_each("...)
	sql = f.bunf.AppendIdent(sql, column)
	if path != "$" && path != "" {
		sql = append(sql, convertJSONPathToPostgresWithMode(path, false)...)
	}
	sql = append(sql, ") AS "...)
	sql = f.bunf.AppendIdent(sql, alias)

	aliasBytes := []byte{}
	aliasBytes = f.bunf.AppendIdent(aliasBytes, alias)
	aliasBytes = append(aliasBytes, ".key"...)
	return sql, aliasBytes
}

func (f *Formatter) JSONArrayAgg(expression string) []byte {
	sql := []byte{}
	sql = append(sql, "jsonb_agg("...)
	sql = append(sql, expression...)
	sql = append(sql, ')')
	return sql
}

func (f *Formatter) JSONArrayLiteral(values ...string) []byte {
	if len(values) == 0 {
		return []byte("jsonb_build_array()")
	}
	sql := []byte{}
	sql = append(sql, "jsonb_build_array("...)
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
	sql = append(sql, "::jsonb"...)
	return sql
}

func convertJSONPathToPostgres(jsonPath string) string {
	return convertJSONPathToPostgresWithMode(jsonPath, true)
}

func convertJSONPathToPostgresWithMode(jsonPath string, asText bool) string {
	path := strings.TrimPrefix(jsonPath, "$")
	if path == "" || path == "." {
		return ""
	}

	parts := strings.Split(strings.TrimPrefix(path, "."), ".")
	if len(parts) == 0 {
		return ""
	}

	var result strings.Builder

	for i, part := range parts {
		if i < len(parts)-1 {
			result.WriteString("->")
			result.WriteString("'")
			result.WriteString(part)
			result.WriteString("'")
		} else {
			if asText {
				result.WriteString("->>")
			} else {
				result.WriteString("->")
			}
			result.WriteString("'")
			result.WriteString(part)
			result.WriteString("'")
		}
	}

	return result.String()
}

func (f *Formatter) Lower(path string) string {
	var result strings.Builder
	result.WriteString("lower(")
	result.WriteString(path)
	result.WriteString(")")
	return result.String()
}
