package preferencetypes

import (
	"encoding/json"
	"reflect"
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

type Range struct {
	Min int64 `json:"min"`
	Max int64 `json:"max"`
}

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
		return Value{}, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "value is not a valid JSON")
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

	switch value.valueType {
	case ValueTypeInteger:
		val, ok := value.goValue.(int64)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not an integer")
		}

		if !preference.IsDiscreteValues {
			if val < preference.Range.Min || val > preference.Range.Max {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not in the range specified, min: %d , max: %d", preference.Range.Min, preference.Range.Max)
			}
		}

		if len(preference.AllowedValues) > 0 {
			found := false
			for _, allowedValue := range preference.AllowedValues {
				allowedVal, ok := allowedValue.(int64)
				if ok && allowedVal == val {
					found = true
					break
				}
			}
			if !found {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not one of the allowed values: %v", preference.AllowedValues)
			}
		}

		preference.Value = value
		return nil

	case ValueTypeFloat:
		val, ok := value.goValue.(float64)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not a float")
		}

		if len(preference.AllowedValues) > 0 {
			found := false
			for _, allowedValue := range preference.AllowedValues {
				allowedVal, ok := allowedValue.(float64)
				if ok && allowedVal == val {
					found = true
					break
				}
			}

			if !found {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not one of the allowed values: %v", preference.AllowedValues)
			}
		}

		preference.Value = value
		return nil

	case ValueTypeString:
		val, ok := value.goValue.(string)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not a string")
		}

		if len(preference.AllowedValues) > 0 {
			found := false
			for _, allowedValue := range preference.AllowedValues {
				allowedVal, ok := allowedValue.(string)
				if ok && allowedVal == val {
					found = true
					break
				}
			}

			if !found {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not in the list of allowedValues: %v", preference.AllowedValues)
			}
		}

		preference.Value = value
		return nil

	case ValueTypeBoolean, ValueTypeArray, ValueTypeObject:
		preference.Value = value
		return nil

	default:
		return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "the preference value type is not supported: %s", preference.ValueType)
	}
}
