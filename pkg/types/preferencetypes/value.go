package preferencetypes

import (
	"encoding/json"
	"reflect"
	"slices"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ValueTypeInteger = ValueType{valuer.NewString("integer")}
	ValueTypeFloat   = ValueType{valuer.NewString("float")}
	ValueTypeString  = ValueType{valuer.NewString("string")}
	ValueTypeBoolean = ValueType{valuer.NewString("boolean")}
	ValueTypeArray   = ValueType{valuer.NewString("array")}
	ValueTypeObject  = ValueType{valuer.NewString("object")}
)

type ValueType struct{ valuer.String }

type Value struct {
	goValue     any
	stringValue string
	valueType   ValueType
}

func NewValue(input any, valueType ValueType) (Value, error) {
	marshalledInput, err := json.Marshal(input)
	if err != nil {
		return Value{}, err
	}

	stringValue := string(marshalledInput)

	switch valueType {
	case ValueTypeInteger:
		val, err := strconv.ParseInt(stringValue, 10, 64)
		if err != nil {
			return Value{}, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "value is not an integer")
		}

		return Value{goValue: val, stringValue: stringValue, valueType: valueType}, nil

	case ValueTypeFloat:
		val, err := strconv.ParseFloat(stringValue, 64)
		if err != nil {
			return Value{}, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "value is not a float")
		}

		return Value{goValue: val, stringValue: stringValue, valueType: valueType}, nil

	case ValueTypeString:
		val, ok := input.(string)
		if !ok {
			return Value{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not a string")
		}

		return Value{goValue: val, stringValue: stringValue, valueType: valueType}, nil

	case ValueTypeBoolean:
		val, err := strconv.ParseBool(stringValue)
		if err != nil {
			return Value{}, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "value is not a boolean")
		}

		return Value{goValue: val, stringValue: stringValue, valueType: valueType}, nil

	case ValueTypeArray:
		valType := reflect.TypeOf(input)
		if valType.Kind() != reflect.Slice && valType.Kind() != reflect.Array {
			return Value{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not an array")
		}

		return Value{goValue: reflect.ValueOf(input).Interface(), stringValue: stringValue, valueType: valueType}, nil

	case ValueTypeObject:
		valType := reflect.TypeOf(input)
		if valType.Kind() != reflect.Map {
			return Value{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not an object")
		}

		return Value{goValue: reflect.ValueOf(input).Interface(), stringValue: stringValue, valueType: valueType}, nil

	default:
		return Value{}, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "value type is not supported: %s", valueType)
	}
}

func MustNewValue(input any, valueType ValueType) Value {
	value, err := NewValue(input, valueType)
	if err != nil {
		panic(err)
	}

	return value
}

func NewValueFromString(stringValue string, valueType ValueType) (Value, error) {
	var value any
	err := json.Unmarshal([]byte(stringValue), &value)
	if err != nil {
		return Value{}, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "value cannot be marshalled to JSON")
	}

	return NewValue(value, valueType)
}

func (value Value) MarshalJSON() ([]byte, error) {
	return []byte(value.stringValue), nil
}

func (preference *Preference) UpdateValue(value Value) error {
	if preference.ValueType != value.valueType {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value type does not match preference value type: %s", preference.ValueType)
	}

	if preference.ValueType == ValueTypeString && len(preference.AllowedValues) > 0 {
		goStringValue, ok := value.goValue.(string)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value %v is not a string", value.goValue)
		}

		if !slices.Contains(preference.AllowedValues, goStringValue) {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value %s is not in the allowed values: %v", goStringValue, preference.AllowedValues)
		}
	}

	preference.Value = value
	return nil
}
