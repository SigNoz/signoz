package postgressqlschema

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/sqlschema"
)

type Formatter struct {
	sqlschema.Formatter
}

func (formatter Formatter) SQLDataTypeOf(dataType sqlschema.DataType) string {
	if dataType == sqlschema.DataTypeTimestamp {
		return "TIMESTAMPTZ"
	}

	return strings.ToUpper(dataType.String())
}

func (formatter Formatter) DataTypeOf(dataType string) sqlschema.DataType {
	switch strings.ToUpper(dataType) {
	case "TIMESTAMPTZ", "TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE":
		return sqlschema.DataTypeTimestamp
	case "INT8":
		return sqlschema.DataTypeBigInt
	case "INT2", "INT4", "SMALLINT", "INTEGER":
		return sqlschema.DataTypeInteger
	case "BOOL", "BOOLEAN":
		return sqlschema.DataTypeBoolean
	case "VARCHAR", "CHARACTER VARYING", "CHARACTER":
		return sqlschema.DataTypeText
	case "BYTEA":
		return sqlschema.DataTypeBytea
	}

	return formatter.Formatter.DataTypeOf(dataType)
}
