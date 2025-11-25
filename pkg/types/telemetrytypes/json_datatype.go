package telemetrytypes

type JSONDataTypeIndex struct {
	Type             JSONDataType
	ColumnExpression string
	IndexExpression  string
}

type JSONDataType struct {
	str            string // Store the correct case for ClickHouse
	IsArray        bool
	ScalerType     string
	IndexSupported bool
}

// Override StringValue to return the correct case
func (jdt JSONDataType) StringValue() string {
	return jdt.str
}

var (
	String       = JSONDataType{"String", false, "", true}
	Int64        = JSONDataType{"Int64", false, "", true}
	Float64      = JSONDataType{"Float64", false, "", true}
	Bool         = JSONDataType{"Bool", false, "", false}
	Dynamic      = JSONDataType{"Dynamic", false, "", false}
	ArrayString  = JSONDataType{"Array(Nullable(String))", true, "String", false}
	ArrayInt64   = JSONDataType{"Array(Nullable(Int64))", true, "Int64", false}
	ArrayFloat64 = JSONDataType{"Array(Nullable(Float64))", true, "Float64", false}
	ArrayBool    = JSONDataType{"Array(Nullable(Bool))", true, "Bool", false}
	ArrayDynamic = JSONDataType{"Array(Dynamic)", true, "Dynamic", false}
	ArrayJSON    = JSONDataType{"Array(JSON)", true, "JSON", false}
)

var MappingStringToJSONDataType = map[string]JSONDataType{
	"String":                   String,
	"Int64":                    Int64,
	"Float64":                  Float64,
	"Bool":                     Bool,
	"Dynamic":                  Dynamic,
	"Array(Nullable(String))":  ArrayString,
	"Array(Nullable(Int64))":   ArrayInt64,
	"Array(Nullable(Float64))": ArrayFloat64,
	"Array(Nullable(Bool))":    ArrayBool,
	"Array(Dynamic)":           ArrayDynamic,
	"Array(JSON)":              ArrayJSON,
}

var ScalerTypeToArrayType = map[JSONDataType]JSONDataType{
	String:  ArrayString,
	Int64:   ArrayInt64,
	Float64: ArrayFloat64,
	Bool:    ArrayBool,
	Dynamic: ArrayDynamic,
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

var MappingJSONDataTypeToFieldDataType = map[JSONDataType]FieldDataType{
	String:       FieldDataTypeString,
	Int64:        FieldDataTypeInt64,
	Float64:      FieldDataTypeFloat64,
	Bool:         FieldDataTypeBool,
	ArrayString:  FieldDataTypeArrayString,
	ArrayInt64:   FieldDataTypeArrayInt64,
	ArrayFloat64: FieldDataTypeArrayFloat64,
	ArrayBool:    FieldDataTypeArrayBool,
	ArrayDynamic: FieldDataTypeArrayDynamic,
	ArrayJSON:    FieldDataTypeArrayObject,
}
