package preferencetypes

import (
	"reflect"

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

func (preference *Preference) UpdateValue(value any) error {
	switch preference.ValueType {
	case ValueTypeInteger:
		val, ok := value.(int64)
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

		preference.Value = val
		return nil
	case ValueTypeFloat:
		val, ok := value.(float64)
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

		preference.Value = val
		return nil
	case ValueTypeString:
		if len(preference.AllowedValues) > 0 {
			found := false
			for _, allowedValue := range preference.AllowedValues {
				allowedVal, ok := allowedValue.(string)
				if ok && allowedVal == value {
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
	case ValueTypeBoolean:
		val, ok := value.(bool)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not a boolean")
		}

		preference.Value = val
		return nil
	case ValueTypeArray:
		valType := reflect.TypeOf(value)
		if valType.Kind() != reflect.Slice && valType.Kind() != reflect.Array {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not an array")
		}

		preference.Value = reflect.ValueOf(value).Interface()
		return nil
	case ValueTypeObject:
		val, ok := value.(map[string]any)
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not an object")
		}

		preference.Value = val
		return nil
	default:
		return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "the preference value type is not supported: %s", preference.ValueType)
	}
}
