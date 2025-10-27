package postgressqlstore

import "strings"

type formatter struct{}

func (formatter formatter) JSONExtractString(column, path string) string {
	var b strings.Builder
	b.WriteString(column)
	b.WriteString(convertJSONPathToPostgres(path))
	return b.String()
}

func (formatter formatter) JSONType(column, path string) string {
	var b strings.Builder
	b.WriteString("jsonb_typeof(")
	b.WriteString(column)
	b.WriteString(convertJSONPathToPostgresWithMode(path, false))
	b.WriteString(")")
	return b.String()
}

func (formatter formatter) JSONIsArray(column, path string) string {
	var b strings.Builder
	b.WriteString(formatter.JSONType(column, path))
	b.WriteString(" = 'array'")
	return b.String()
}

func (formatter formatter) JSONArrayElements(column, path, alias string) string {
	var b strings.Builder
	b.WriteString("jsonb_array_elements(")
	b.WriteString(column)
	if path != "$" && path != "" {
		b.WriteString(convertJSONPathToPostgresWithMode(path, false))
	}
	b.WriteString(") AS ")
	b.WriteString(alias)
	b.WriteString("(value)")
	return b.String()
}

func (formatter formatter) JSONArrayAgg(expression string) string {
	var b strings.Builder
	b.WriteString("jsonb_agg(")
	b.WriteString(expression)
	b.WriteString(")")
	return b.String()
}

func (formatter formatter) JSONArrayLiteral(values ...string) string {
	if len(values) == 0 {
		return "jsonb_build_array()"
	}
	var b strings.Builder
	b.WriteString("jsonb_build_array(")
	for i, v := range values {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString("'")
		b.WriteString(v)
		b.WriteString("'")
	}
	b.WriteString(")")
	return b.String()
}

func (formatter formatter) TextToJsonColumn(column string) string {
	var b strings.Builder
	b.WriteString(column)
	b.WriteString("::jsonb")
	return b.String()
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
