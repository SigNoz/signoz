package clickhousesql

import (
	"fmt"
	"reflect"
	"strings"
)

var likePatternEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func StringLiteral(value string) string {
	return quote(value, '\'')
}

func Identifier(value string) string {
	return quote(value, '`')
}

// LikePattern escapes value so LIKE matches it verbatim; the caller adds the wildcards.
func LikePattern(value string) string {
	return likePatternEscaper.Replace(value)
}

// Literal renders a Go scalar or a list of scalars as a ClickHouse literal. Pointers
// are dereferenced first; a nil or an unsupported value renders as an empty string.
func Literal(value any) string {
	switch x := deref(value).(type) {
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return StringLiteral(x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []any:
		if len(x) == 0 {
			return "[]"
		}
		switch x[0].(type) {
		case string:
			return stringArray(x)
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			return "[]"
		}
	case []string:
		items := make([]any, len(x))
		for i, s := range x {
			items[i] = s
		}
		return stringArray(items)
	default:
		return ""
	}
}

// A "$" followed by a digit, "{" or "?" is written as "\x24"; any other "$" stays as is.
func quote(value string, delimiter byte) string {
	var b strings.Builder
	b.Grow(len(value) + 2)
	b.WriteByte(delimiter)
	for i := 0; i < len(value); i++ {
		c := value[i]
		switch {
		case c == '\\' || c == delimiter:
			b.WriteByte('\\')
			b.WriteByte(c)
		case c == '$' && i+1 < len(value) && (value[i+1] == '{' || value[i+1] == '?' || (value[i+1] >= '0' && value[i+1] <= '9')):
			b.WriteString(`\x24`)
		default:
			b.WriteByte(c)
		}
	}
	b.WriteByte(delimiter)
	return b.String()
}

func stringArray(items []any) string {
	quoted := make([]string, len(items))
	for i, item := range items {
		quoted[i] = StringLiteral(fmt.Sprint(item))
	}
	return "[" + strings.Join(quoted, ",") + "]"
}

func deref(value any) any {
	if value == nil {
		return nil
	}
	if list, ok := value.([]any); ok {
		out := make([]any, len(list))
		for i, item := range list {
			out[i] = deref(item)
		}
		return out
	}
	rv := reflect.ValueOf(value)
	if rv.Kind() != reflect.Pointer {
		return value
	}
	if rv.IsNil() {
		return nil
	}
	return rv.Elem().Interface()
}
