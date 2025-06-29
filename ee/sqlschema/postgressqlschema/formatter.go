package postgressqlschema

import "github.com/SigNoz/signoz/pkg/sqlschema"

type Formatter struct {
	sqlschema.Formatter
}

func (formatter Formatter) SQLDataTypeOf(dataType sqlschema.DataType) string {
	if dataType == sqlschema.DataTypeTimestamp {
		return "TIMESTAMPTZ"
	}

	return dataType.String()
}
