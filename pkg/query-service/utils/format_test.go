package utils

import (
	"reflect"
	"testing"

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
