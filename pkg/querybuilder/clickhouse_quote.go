package querybuilder

import "strings"

// ClickHouseStringLiteral quotes a value for a ClickHouse string literal.
func ClickHouseStringLiteral(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `'`, `\'`)
	return "'" + escaped + "'"
}

// ClickHouseLikePatternLiteral escapes the LIKE metacharacters so value matches as literal
// text inside a pattern. Backslash goes first, being the escape character itself.
func ClickHouseLikePatternLiteral(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `%`, `\%`)
	return strings.ReplaceAll(escaped, `_`, `\_`)
}

// ClickHouseIdentifier quotes a value for a ClickHouse identifier.
func ClickHouseIdentifier(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, "`", "\\`")
	return "`" + escaped + "`"
}
