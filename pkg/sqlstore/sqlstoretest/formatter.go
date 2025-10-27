package sqlstoretest

import "strings"

type formatter struct{}

func (f *formatter) JSONExtractString(column, path string) string {
	var b strings.Builder
	b.WriteString("json_extract(")
	b.WriteString(column)
	b.WriteString(", '")
	b.WriteString(path)
	b.WriteString("')")
	return b.String()
}

func (f *formatter) JSONType(column, path string) string {
	var b strings.Builder
	b.WriteString("json_type(")
	b.WriteString(column)
	b.WriteString(", '")
	b.WriteString(path)
	b.WriteString("')")
	return b.String()
}

func (f *formatter) JSONIsArray(column, path string) string {
	var b strings.Builder
	b.WriteString(f.JSONType(column, path))
	b.WriteString(" = 'array'")
	return b.String()
}

func (f *formatter) JSONArrayElements(column, path, alias string) string {
	var b strings.Builder
	b.WriteString("json_each(")
	b.WriteString(column)
	if path != "$" && path != "" {
		b.WriteString(", '")
		b.WriteString(path)
		b.WriteString("'")
	}
	b.WriteString(") AS ")
	b.WriteString(alias)
	return b.String()
}

func (f *formatter) JSONArrayAgg(expression string) string {
	var b strings.Builder
	b.WriteString("json_group_array(")
	b.WriteString(expression)
	b.WriteString(")")
	return b.String()
}

func (f *formatter) JSONArrayLiteral(values ...string) string {
	if len(values) == 0 {
		return "json_array()"
	}
	var b strings.Builder
	b.WriteString("json_array(")
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

func (f *formatter) TextToJsonColumn(column string) string {
	return column
}
