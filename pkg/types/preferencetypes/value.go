package preferencetypes

import (
	"encoding/json"
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

func NewPreferenceValueFromString(preference *Preference, value string) (any, error) {
	switch preference.ValueType {
	case ValueTypeInteger:
		val, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return nil, err
		}

		if !preference.IsDiscreteValues {
			if val < preference.Range.Min || val > preference.Range.Max {
				return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not in the range specified, min: %d , max: %d", preference.Range.Min, preference.Range.Max)
			}
		}

		if len(preference.AllowedValues) > 0 {
			for _, allowedValue := range preference.AllowedValues {
				if allowedValue == val {
					return val, nil
				}
			}
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not one of the allowed values: %v", preference.AllowedValues)
		}

		return val, nil
	case ValueTypeFloat:
		val, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return nil, err
		}

		if len(preference.AllowedValues) > 0 {
			for _, allowedValue := range preference.AllowedValues {
				if allowedValue == val {
					return val, nil
				}
			}
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not one of the allowed values: %v", preference.AllowedValues)
		}

		return val, nil
	case ValueTypeString:
		if len(preference.AllowedValues) > 0 {
			for _, allowedValue := range preference.AllowedValues {
				if allowedValue == value {
					return value, nil
				}
			}

			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is not in the list of allowedValues: %v", preference.AllowedValues)
		}
		return value, nil
	case ValueTypeBoolean:
		return strconv.ParseBool(value)
	case ValueTypeArray:
		var arr []any
		err := json.Unmarshal([]byte(value), &arr)
		if err != nil {
			return nil, err
		}
		return arr, nil
	case ValueTypeObject:
		var obj map[string]any
		err := json.Unmarshal([]byte(value), &obj)
		if err != nil {
			return nil, err
		}
		return obj, nil
	default:
		return nil, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "the preference value type is not supported: %s", preference.ValueType)
	}
}
