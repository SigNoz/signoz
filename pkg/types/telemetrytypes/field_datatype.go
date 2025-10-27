package telemetrytypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldDataType is the data type of the field. It is expected to be used to disambiguate b/w
// different data types of the same field.
type FieldDataType struct {
	valuer.String
}

var (
	FieldDataTypeString  = FieldDataType{valuer.NewString("string")}
	FieldDataTypeBool    = FieldDataType{valuer.NewString("bool")}
	FieldDataTypeFloat64 = FieldDataType{valuer.NewString("float64")}
	// int64 and number are synonyms for float64
	FieldDataTypeInt64       = FieldDataType{valuer.NewString("int64")}
	FieldDataTypeNumber      = FieldDataType{valuer.NewString("number")}
	FieldDataTypeUnspecified = FieldDataType{valuer.NewString("")}

	FieldDataTypeArrayString  = FieldDataType{valuer.NewString("[]string")}
	FieldDataTypeArrayFloat64 = FieldDataType{valuer.NewString("[]float64")}
	FieldDataTypeArrayBool    = FieldDataType{valuer.NewString("[]bool")}

	// int64 and number are synonyms for float64
	FieldDataTypeArrayInt64  = FieldDataType{valuer.NewString("[]int64")}
	FieldDataTypeArrayNumber = FieldDataType{valuer.NewString("[]number")}

	// Map string representations to FieldDataType values
	// We want to handle all the possible string representations of the data types.
	// Even if the user uses some non-standard representation, we want to be able to
	// parse it correctly.
	fieldDataTypes = map[string]FieldDataType{
		// String types
		"string": FieldDataTypeString,
		"str":    FieldDataTypeString,

		// Boolean types
		"bool": FieldDataTypeBool,

		// Integer types
		"int":    FieldDataTypeNumber,
		"int8":   FieldDataTypeNumber,
		"int16":  FieldDataTypeNumber,
		"int32":  FieldDataTypeNumber,
		"int64":  FieldDataTypeNumber,
		"uint":   FieldDataTypeNumber,
		"uint8":  FieldDataTypeNumber,
		"uint16": FieldDataTypeNumber,
		"uint32": FieldDataTypeNumber,
		"uint64": FieldDataTypeNumber,

		// Float types
		"float":   FieldDataTypeNumber,
		"float32": FieldDataTypeNumber,
		"float64": FieldDataTypeNumber,
		"double":  FieldDataTypeNumber,
		"decimal": FieldDataTypeNumber,
		"number":  FieldDataTypeNumber,

		// Array types
		"[]string":  FieldDataTypeArrayString,
		"[]int64":   FieldDataTypeArrayInt64,
		"[]float64": FieldDataTypeArrayFloat64,
		"[]number":  FieldDataTypeArrayNumber,
		"[]bool":    FieldDataTypeArrayBool,

		// c-style array types
		"string[]":  FieldDataTypeArrayString,
		"int64[]":   FieldDataTypeArrayInt64,
		"float64[]": FieldDataTypeArrayFloat64,
		"number[]":  FieldDataTypeArrayNumber,
		"bool[]":    FieldDataTypeArrayBool,
	}

	fieldDataTypeToCHDataType = map[FieldDataType]string{
		FieldDataTypeString:  "String",
		FieldDataTypeBool:    "Bool",
		FieldDataTypeNumber:  "Float64",
		FieldDataTypeInt64:   "Int64",
		FieldDataTypeFloat64: "Float64",

		FieldDataTypeArrayString:  "Array(String)",
		FieldDataTypeArrayInt64:   "Array(Int64)",
		FieldDataTypeArrayFloat64: "Array(Float64)",
		FieldDataTypeArrayBool:    "Array(Bool)",
	}
)

func (f FieldDataType) CHDataType() string {
	if chDataType, ok := fieldDataTypeToCHDataType[f]; ok {
		return chDataType
	}
	return "String"
}

// UnmarshalJSON implements the json.Unmarshaler interface
func (f *FieldDataType) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	// Normalize the string
	normalizedStr := strings.ToLower(strings.TrimSpace(str))

	// Look up the data type in our map
	if dataType, exists := fieldDataTypes[normalizedStr]; exists {
		*f = dataType
		return nil
	}

	// Default to unspecified if not found
	*f = FieldDataTypeUnspecified
	return nil
}

// Scan implements the sql.Scanner interface
func (f *FieldDataType) Scan(value interface{}) error {
	if f == nil {
		return errors.NewInternalf(errors.CodeInternal, "fielddatatype: nil receiver")
	}

	if value == nil {
		*f = FieldDataTypeUnspecified
		return nil
	}

	str, ok := value.(string)
	if !ok {
		return errors.NewInternalf(errors.CodeInternal, "fielddatatype: expected string, got %T", value)
	}

	// Normalize the string
	normalizedStr := strings.ToLower(strings.TrimSpace(str))

	// Look up the data type in our map
	if dataType, exists := fieldDataTypes[normalizedStr]; exists {
		*f = dataType
		return nil
	}

	// Default to unspecified if not found
	*f = FieldDataTypeUnspecified
	return nil
}

func (f FieldDataType) TagDataType() string {
	switch f {
	case FieldDataTypeString:
		return "string"
	case FieldDataTypeBool:
		return "bool"
	case FieldDataTypeNumber, FieldDataTypeInt64, FieldDataTypeFloat64:
		return "float64"
	default:
		return "string"
	}
}
