package sqlitesqlschema

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/sqlschema"
)

type Formatter struct {
	sqlschema.Formatter
}

func (formatter Formatter) SQLDataTypeOf(dataType sqlschema.DataType) string {
	if dataType == sqlschema.DataTypeNumeric {
		return "REAL"
	}

	return strings.ToUpper(dataType.String())
}

func (formatter Formatter) DataTypeOf(dataType string) sqlschema.DataType {
	switch strings.ToUpper(dataType) {
	case "REAL":
		return sqlschema.DataTypeNumeric
	}

	return formatter.Formatter.DataTypeOf(dataType)
}
