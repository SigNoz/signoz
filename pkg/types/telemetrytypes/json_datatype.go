package telemetrytypes

import (
	"fmt"
	"math"
)

type JSONDataType struct {
	str        string // Store the correct case for ClickHouse
	IsArray    bool
	ScalerType string
}

// Override StringValue to return the correct case
func (jdt JSONDataType) StringValue() string {
	return jdt.str
}

var (
	String                = JSONDataType{"String", false, ""}
	Int64                 = JSONDataType{"Int64", false, ""}
	Float64               = JSONDataType{"Float64", false, ""}
	Bool                  = JSONDataType{"Bool", false, ""}
	Dynamic               = JSONDataType{"Dynamic", false, ""}
	ArrayString           = JSONDataType{"Array(Nullable(String))", true, "String"}
	ArrayInt64            = JSONDataType{"Array(Nullable(Int64))", true, "Int64"}
	ArrayFloat64          = JSONDataType{"Array(Nullable(Float64))", true, "Float64"}
	ArrayBool             = JSONDataType{"Array(Nullable(Bool))", true, "Bool"}
	ArrayDynamic          = JSONDataType{"Array(Dynamic)", true, "Dynamic"}
	ArrayJSONNestedLevel1 = JSONDataType{"Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel2 = JSONDataType{"Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel3 = JSONDataType{"Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel4 = JSONDataType{"Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel5 = JSONDataType{"Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel6 = JSONDataType{"Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSON             = JSONDataType{"Array(JSON)", true, "JSON"}
)

func NestedLevelArrayJSON(level int, isBodyV2 bool) JSONDataType {
	if isBodyV2 {
		return JSONDataType{fmt.Sprintf("Array(JSON(max_dynamic_types=%d, max_dynamic_paths=0))", int(32/math.Pow(2, float64(level)))), true, "JSON"}
	}
	return JSONDataType{fmt.Sprintf("Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))", int(32/math.Pow(2, float64(level))), int(1024/math.Pow(4, float64(level)))), true, "JSON"}
}

var MappingStringToJSONDataType = map[string]JSONDataType{
	"String":         String,
	"Int64":          Int64,
	"Float64":        Float64,
	"Bool":           Bool,
	"Dynamic":        Dynamic,
	"Array(String)":  ArrayString,
	"Array(Int64)":   ArrayInt64,
	"Array(Float64)": ArrayFloat64,
	"Array(Bool)":    ArrayBool,
	"Array(Dynamic)": ArrayDynamic,
	"Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))": ArrayJSONNestedLevel1,
	"Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))":  ArrayJSONNestedLevel2,
	"Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))":  ArrayJSONNestedLevel3,
	"Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))":  ArrayJSONNestedLevel4,
	"Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))":  ArrayJSONNestedLevel5,
	"Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))":  ArrayJSONNestedLevel6,
	"Array(JSON)": ArrayJSON,
}

var ScalerTypeToArrayType = map[JSONDataType]JSONDataType{
	String:  ArrayString,
	Int64:   ArrayInt64,
	Float64: ArrayFloat64,
	Bool:    ArrayBool,
	Dynamic: ArrayDynamic,
}

var ScalerTypeToJSONDataType = map[string]JSONDataType{
	"String":  String,
	"Int64":   Int64,
	"Float64": Float64,
	"Bool":    Bool,
	"Dynamic": Dynamic,
}

var MappingFieldDataTypeToJSONDataType = map[FieldDataType]JSONDataType{
	FieldDataTypeString:       String,
	FieldDataTypeInt64:        Int64,
	FieldDataTypeFloat64:      Float64,
	FieldDataTypeNumber:       Float64,
	FieldDataTypeBool:         Bool,
	FieldDataTypeArrayString:  ArrayString,
	FieldDataTypeArrayInt64:   ArrayInt64,
	FieldDataTypeArrayFloat64: ArrayFloat64,
	FieldDataTypeArrayBool:    ArrayBool,
}
