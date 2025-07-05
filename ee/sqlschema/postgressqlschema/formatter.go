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
	case "TIMESTAMPTZ":
		return sqlschema.DataTypeTimestamp
	case "INT8":
		return sqlschema.DataTypeBigInt
	}

	return formatter.Formatter.DataTypeOf(dataType)
}
