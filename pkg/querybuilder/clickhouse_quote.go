package querybuilder

import "strings"

// ClickHouseStringLiteral quotes a value for a ClickHouse string literal.
func ClickHouseStringLiteral(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `'`, `\'`)
	return "'" + escaped + "'"
}

// ClickHouseIdentifier quotes a value for a ClickHouse identifier.
func ClickHouseIdentifier(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, "`", "\\`")
	return "`" + escaped + "`"
}
