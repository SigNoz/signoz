package sqlschema

import (
	"strings"

	"github.com/uptrace/bun/schema"
)

type Formatter struct {
	s schema.Formatter
}

func NewFormatter(dialect schema.Dialect) Formatter {
	return Formatter{s: schema.NewFormatter(dialect)}
}

func (formatter Formatter) SQLDataTypeOf(dataType DataType) string {
	return strings.ToUpper(dataType.String())
}

func (formatter Formatter) AppendIdent(b []byte, ident string) []byte {
	return formatter.s.AppendIdent(b, ident)
}
