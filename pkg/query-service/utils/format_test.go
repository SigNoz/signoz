package utils

import (
	"reflect"
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type args struct {
	v        interface{}
	dataType v3.AttributeKeyDataType
}

var testValidateAndCastValueData = []struct {
	name    string
	args    args
	want    interface{}
	wantErr bool
}{
	// Test cases for v3.AttributeKeyDataTypeString
	{
		name: "v3.AttributeKeyDataTypeString: Valid string",
		args: args{
			v:        "test",
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    "test",
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid int",
		args: args{
			v:        1,
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    "1",
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid float32",
		args: args{
			v:        float32(1.1),
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    "1.1",
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid float64",
		args: args{
			v:        float64(1.1),
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    "1.1",
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid bool",
		args: args{
			v:        true,
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    "true",
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid []interface{}",
		args: args{
			v:        []interface{}{"test", "test2"},
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    []interface{}{"test", "test2"},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Valid []interface{}",
		args: args{
			v:        []interface{}{"test", 1},
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    []interface{}{"test", "1"},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Invalid []interface{}",
		args: args{
			v:        []interface{}{"test", [1]string{"string Array"}},
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    nil,
		wantErr: true,
	},
	{
		name: "v3.AttributeKeyDataTypeString: Invalid type",
		args: args{
			v:        map[string]interface{}{"test": "test"},
			dataType: v3.AttributeKeyDataTypeString,
		},
		want:    nil,
		wantErr: true,
	},
	// Test cases for v3.AttributeKeyDataTypeBool
	{
		name: "v3.AttributeKeyDataTypeBool: Valid bool",
		args: args{
			v:        true,
			dataType: v3.AttributeKeyDataTypeBool,
		},
		want:    true,
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeBool: Valid string",
		args: args{
			v:        "true",
			dataType: v3.AttributeKeyDataTypeBool,
		},
		want:    true,
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeBool: Valid []interface{}",
		args: args{
			v:        []interface{}{"true", false},
			dataType: v3.AttributeKeyDataTypeBool,
		},
		want:    []interface{}{true, false},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeBool: Invalid type",
		args: args{
			v:        1,
			dataType: v3.AttributeKeyDataTypeBool,
		},
		want:    nil,
		wantErr: true,
	},
	{
		name: "v3.AttributeKeyDataTypeBool: Invalid []interface{}",
		args: args{
			v:        []interface{}{1, false},
			dataType: v3.AttributeKeyDataTypeBool,
		},
		want:    nil,
		wantErr: true,
	},
	// Test cases for v3.AttributeKeyDataTypeInt64
	{
		name: "v3.AttributeKeyDataTypeInt64: Valid int",
		args: args{
			v:        1,
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    1,
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: Valid int64",
		args: args{
			v:        int64(1),
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    int64(1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: Valid string",
		args: args{
			v:        "1",
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    int64(1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: Valid []interface{}",
		args: args{
			v:        []interface{}{"1", 2},
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    []interface{}{int64(1), int64(2)},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: Invalid []interface{}",
		args: args{
			v:        []interface{}{"1", false},
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    nil,
		wantErr: true,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: Invalid type",
		args: args{
			v:        true,
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    nil,
		wantErr: true,
	},
	// Test cases for v3.AttributeKeyDataTypeFloat64
	{
		name: "v3.AttributeKeyDataTypeFloat64: Valid float32",
		args: args{
			v:        float32(1.1),
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    float32(1.1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat64: Valid float64",
		args: args{
			v:        float64(1.1),
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    float64(1.1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat64: Valid int",
		args: args{
			v:        1,
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    float64(1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat64: Valid string",
		args: args{
			v:        "1.1",
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    float64(1.1),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat: Valid []interface{}",
		args: args{
			v:        []interface{}{4, 3},
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    []interface{}{float64(4), float64(3)},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat: Valid []interface{}",
		args: args{
			v:        []interface{}{4, "3"},
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    []interface{}{float64(4), float64(3)},
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat: Invalid []interface{}",
		args: args{
			v:        []interface{}{4, "true"},
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    nil,
		wantErr: true,
	},
	{
		name: "v3.AttributeKeyDataTypeFloat64: Invalid type",
		args: args{
			v:        true,
			dataType: v3.AttributeKeyDataTypeFloat64,
		},
		want:    nil,
		wantErr: true,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: valid float32",
		args: args{
			v:        float32(1000),
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    int64(1000),
		wantErr: false,
	},
	{
		name: "v3.AttributeKeyDataTypeInt64: valid float64",
		args: args{
			v:        float64(1000),
			dataType: v3.AttributeKeyDataTypeInt64,
		},
		want:    int64(1000),
		wantErr: false,
	},
}

// Test cases for ValidateAndCastValue function in pkg/query-service/utils/format.go
func TestValidateAndCastValue(t *testing.T) {
	for _, tt := range testValidateAndCastValueData {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ValidateAndCastValue(tt.args.v, tt.args.dataType)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateAndCastValue() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) && !reflect.DeepEqual(err, tt.wantErr) {
				t.Errorf("ValidateAndCastValue() = %v, want %v", got, tt.want)
			}
		})
	}
}

var one = 1
var onePointOne = 1.1
var oneString = "1"
var trueBool = true

var testClickHouseFormattedValueData = []struct {
	name  string
	value interface{}
	want  interface{}
}{
	{
		name:  "int",
		value: 1,
		want:  "1",
	},
	{
		name:  "int64",
		value: int64(1),
		want:  "1",
	},
	{
		name:  "float32",
		value: float32(1.1),
		want:  "1.100000",
	},
	{
		name:  "string",
		value: "1",
		want:  "'1'",
	},
	{
		name:  "bool",
		value: true,
		want:  "true",
	},
	{
		name:  "[]interface{}",
		value: []interface{}{1, 2},
		want:  "[1,2]",
	},
	{
		name:  "[]interface{}",
		value: []interface{}{"1", "2"},
		want:  "['1','2']",
	},
	{
		name:  "pointer int",
		value: &one,
		want:  "1",
	},
	{
		name:  "pointer float32",
		value: onePointOne,
		want:  "1.100000",
	},
	{
		name:  "pointer string",
		value: &oneString,
		want:  "'1'",
	},
	{
		name:  "pointer bool",
		value: &trueBool,
		want:  "true",
	},
	{
		name:  "pointer []interface{}",
		value: []interface{}{&one, &one},
		want:  "[1,1]",
	},
	{
		name:  "string with single quote",
		value: "test'1",
		want:  "'test\\'1'",
	},
	{
		name: "[]interface{} with string with single quote",
		value: []interface{}{
			"test'1",
			"test'2",
		},
		want: "['test\\'1','test\\'2']",
	},
}

func TestClickHouseFormattedValue(t *testing.T) {
	for _, tt := range testClickHouseFormattedValueData {
		t.Run(tt.name, func(t *testing.T) {
			got := ClickHouseFormattedValue(tt.value)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ClickHouseFormattedValue() = %v, want %v", got, tt.want)
			}
		})
	}
}

var testGetClickhouseColumnName = []struct {
	name     string
	typeName string
	dataType string
	field    string
	want     string
}{
	{
		name:     "tag",
		typeName: string(v3.AttributeKeyTypeTag),
		dataType: string(v3.AttributeKeyDataTypeInt64),
		field:    "tag1",
		want:     "`attribute_int64_tag1`",
	},
	{
		name:     "resource",
		typeName: string(v3.AttributeKeyTypeResource),
		dataType: string(v3.AttributeKeyDataTypeInt64),
		field:    "tag1",
		want:     "`resource_int64_tag1`",
	},
	{
		name:     "attribute old parser",
		typeName: constants.Attributes,
		dataType: string(v3.AttributeKeyDataTypeInt64),
		field:    "tag1",
		want:     "`attribute_int64_tag1`",
	},
	{
		name:     "resource old parser",
		typeName: constants.Resources,
		dataType: string(v3.AttributeKeyDataTypeInt64),
		field:    "tag1",
		want:     "`resource_int64_tag1`",
	},
}

func TestGetClickhouseColumnName(t *testing.T) {
	for _, tt := range testGetClickhouseColumnName {
		t.Run(tt.name, func(t *testing.T) {
			got := GetClickhouseColumnName(tt.typeName, tt.dataType, tt.field)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ClickHouseFormattedValue() = %v, want %v", got, tt.want)
			}
		})
	}
}

var testGetEpochNanoSecsData = []struct {
	Name       string
	Epoch      int64
	Multiplier int64
	Result     int64
}{
	{
		Name:   "Test 1",
		Epoch:  1680712080000,
		Result: 1680712080000000000,
	},
	{
		Name:   "Test 1",
		Epoch:  1680712080000000000,
		Result: 1680712080000000000,
	},
}

func TestGetEpochNanoSecs(t *testing.T) {
	for _, tt := range testGetEpochNanoSecsData {
		t.Run(tt.Name, func(t *testing.T) {
			got := GetEpochNanoSecs(tt.Epoch)
			if !reflect.DeepEqual(got, tt.Result) {
				t.Errorf("ClickHouseFormattedValue() = %v, want %v", got, tt.Result)
			}
		})
	}
}
