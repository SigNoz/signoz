package telemetrytypes

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
	Int                   = JSONDataType{"Int64", false, ""}
	Float64               = JSONDataType{"Float64", false, ""}
	Bool                  = JSONDataType{"Bool", false, ""}
	Dynamic               = JSONDataType{"Dynamic", false, ""}
	ArrayString           = JSONDataType{"Array(Nullable(String))", true, "String"}
	ArrayInt              = JSONDataType{"Array(Nullable(Int64))", true, "Int64"}
	ArrayFloat64          = JSONDataType{"Array(Nullable(Float64))", true, "Float64"}
	ArrayBool             = JSONDataType{"Array(Nullable(Bool))", true, "Bool"}
	ArrayDynamic          = JSONDataType{"Array(Dynamic)", true, "Dynamic"}
	ArrayJSONNestedLevel1 = JSONDataType{"Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))", true, "JSON"}
	ArrayJSONNestedLevel2 = JSONDataType{"Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))", true, "JSON"}
	// Backward-compatible alias to simplify references across code paths
	ArrayJSON = ArrayJSONNestedLevel1
)

var MappingStringToJSONDataType = map[string]JSONDataType{
	"String":         String,
	"Int64":          Int,
	"Float64":        Float64,
	"Bool":           Bool,
	"Dynamic":        Dynamic,
	"Array(String)":  ArrayString,
	"Array(Int64)":   ArrayInt,
	"Array(Float64)": ArrayFloat64,
	"Array(Bool)":    ArrayBool,
	"Array(Dynamic)": ArrayDynamic,
	"Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))": ArrayJSONNestedLevel1,
	"Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))":  ArrayJSONNestedLevel2,
}

var MappingFieldDataTypeToJSONDataType = map[FieldDataType]JSONDataType{
	FieldDataTypeString:       String,
	FieldDataTypeInt64:        Int,
	FieldDataTypeFloat64:      Float64,
	FieldDataTypeNumber:       Float64,
	FieldDataTypeBool:         Bool,
	FieldDataTypeArrayString:  ArrayString,
	FieldDataTypeArrayInt64:   ArrayInt,
	FieldDataTypeArrayFloat64: ArrayFloat64,
	FieldDataTypeArrayBool:    ArrayBool,
}
