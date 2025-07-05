package sqlschema

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
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

func (formatter Formatter) DataTypeOf(dataType string) DataType {
	switch strings.ToUpper(dataType) {
	case "TEXT":
		return DataTypeText
	case "BIGINT":
		return DataTypeBigInt
	case "INTEGER":
		return DataTypeInteger
	case "NUMERIC":
		return DataTypeNumeric
	case "BOOLEAN":
		return DataTypeBoolean
	case "TIMESTAMP":
		return DataTypeTimestamp
	default:
		return DataType{s: valuer.NewString(dataType)}
	}
}

func (formatter Formatter) AppendIdent(b []byte, ident string) []byte {
	return formatter.s.AppendIdent(b, ident)
}

func (formatter Formatter) AppendValue(b []byte, v any) []byte {
	return schema.Append(formatter.s, b, v)
}
