package telemetrytypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldSelectorMatchType is the match type of the field key selector.
type FieldSelectorMatchType struct {
	valuer.String
}

var (
	FieldSelectorMatchTypeExact = FieldSelectorMatchType{valuer.NewString("exact")}
	FieldSelectorMatchTypeFuzzy = FieldSelectorMatchType{valuer.NewString("fuzzy")}
)

type TelemetryFieldKey struct {
	Name          string        `json:"name"`
	Description   string        `json:"description,omitempty"`
	Unit          string        `json:"unit,omitempty"`
	Signal        Signal        `json:"signal,omitempty"`
	FieldContext  FieldContext  `json:"fieldContext,omitempty"`
	FieldDataType FieldDataType `json:"fieldDataType,omitempty"`
	Materialized  bool          `json:"materialized,omitempty"`
}

func (f TelemetryFieldKey) String() string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("name=%s", f.Name))
	if f.FieldContext != FieldContextUnspecified {
		sb.WriteString(fmt.Sprintf(",context=%s", f.FieldContext.String))
	}
	if f.FieldDataType != FieldDataTypeUnspecified {
		sb.WriteString(fmt.Sprintf(",type=%s", f.FieldDataType.StringValue()))
	}
	return sb.String()
}

// GetFieldKeyFromKeyText returns a TelemetryFieldKey from a key text.
// The key text is expected to be in the format of `fieldContext.fieldName:fieldDataType` in the search query.
func GetFieldKeyFromKeyText(key string) TelemetryFieldKey {

	keyTextParts := strings.Split(key, ".")

	var explicitFieldContextProvided, explicitFieldDataTypeProvided bool
	var explicitFieldContext FieldContext
	var explicitFieldDataType FieldDataType
	var ok bool

	if len(keyTextParts) > 1 {
		explicitFieldContext, ok = fieldContexts[keyTextParts[0]]
		if ok && explicitFieldContext != FieldContextUnspecified {
			explicitFieldContextProvided = true
		}
	}

	if explicitFieldContextProvided {
		keyTextParts = keyTextParts[1:]
	}

	// check if there is a field data type provided
	if len(keyTextParts) >= 1 {
		lastPart := keyTextParts[len(keyTextParts)-1]
		lastPartParts := strings.Split(lastPart, ":")
		if len(lastPartParts) > 1 {
			explicitFieldDataType, ok = fieldDataTypes[lastPartParts[1]]
			if ok && explicitFieldDataType != FieldDataTypeUnspecified {
				explicitFieldDataTypeProvided = true
			}
		}

		if explicitFieldDataTypeProvided {
			keyTextParts[len(keyTextParts)-1] = lastPartParts[0]
		}
	}

	realKey := strings.Join(keyTextParts, ".")

	fieldKeySelector := TelemetryFieldKey{
		Name: realKey,
	}

	if explicitFieldContextProvided {
		fieldKeySelector.FieldContext = explicitFieldContext
	} else {
		fieldKeySelector.FieldContext = FieldContextUnspecified
	}

	if explicitFieldDataTypeProvided {
		fieldKeySelector.FieldDataType = explicitFieldDataType
	} else {
		fieldKeySelector.FieldDataType = FieldDataTypeUnspecified
	}

	return fieldKeySelector
}

func FieldKeyToMaterializedColumnName(key *TelemetryFieldKey) string {
	return fmt.Sprintf("`%s_%s_%s`", key.FieldContext.String, fieldDataTypes[key.FieldDataType.StringValue()].StringValue(), strings.ReplaceAll(key.Name, ".", "$$"))
}

func FieldKeyToMaterializedColumnNameForExists(key *TelemetryFieldKey) string {
	return fmt.Sprintf("`%s_%s_%s_exists`", key.FieldContext.String, fieldDataTypes[key.FieldDataType.StringValue()].StringValue(), strings.ReplaceAll(key.Name, ".", "$$"))
}

type TelemetryFieldValues struct {
	StringValues  []string  `json:"stringValues,omitempty"`
	BoolValues    []bool    `json:"boolValues,omitempty"`
	NumberValues  []float64 `json:"numberValues,omitempty"`
	RelatedValues []string  `json:"relatedValues,omitempty"`
}

type MetricContext struct {
	MetricName string `json:"metricName"`
}

type FieldKeySelector struct {
	StartUnixMilli    int64                  `json:"startUnixMilli"`
	EndUnixMilli      int64                  `json:"endUnixMilli"`
	Signal            Signal                 `json:"signal"`
	FieldContext      FieldContext           `json:"fieldContext"`
	FieldDataType     FieldDataType          `json:"fieldDataType"`
	Name              string                 `json:"name"`
	SelectorMatchType FieldSelectorMatchType `json:"selectorMatchType"`
	Limit             int                    `json:"limit"`
	MetricContext     *MetricContext         `json:"metricContext,omitempty"`
}

type FieldValueSelector struct {
	*FieldKeySelector
	ExistingQuery string `json:"existingQuery"`
	Value         string `json:"value"`
	Limit         int    `json:"limit"`
}

func DataTypeCollisionHandledFieldName(key *TelemetryFieldKey, value any, tblFieldName string) (string, any) {
	// This block of code exists to handle the data type collisions
	// We don't want to fail the requests when there is a key with more than one data type
	// Let's take an example of `http.status_code`, and consider user sent a string value and number value
	// When they search for `http.status_code=200`, we will search across both the number columns and string columns
	// and return the results from both the columns
	// While we expect user not to send the mixed data types, it inevitably happens
	// So we handle the data type collisions here
	switch key.FieldDataType {
	case FieldDataTypeString:
		switch value.(type) {
		case float64:
			// try to convert the string value to to number
			tblFieldName = fmt.Sprintf(`toFloat64OrNull(%s)`, tblFieldName)
		case []any:
			areFloats := true
			for _, v := range value.([]any) {
				if _, ok := v.(float64); !ok {
					areFloats = false
					break
				}
			}
			if areFloats {
				tblFieldName = fmt.Sprintf(`toFloat64OrNull(%s)`, tblFieldName)
			}
		case bool:
			// we don't have a toBoolOrNull in ClickHouse, so we need to convert the bool to a string
			value = fmt.Sprintf("%t", value)
		case string:
			// nothing to do
		}
	case FieldDataTypeFloat64, FieldDataTypeInt64, FieldDataTypeNumber:
		switch value.(type) {
		case string:
			// try to convert the string value to to number
			tblFieldName = fmt.Sprintf(`toString(%s)`, tblFieldName)
		case float64:
			// nothing to do
		}
	case FieldDataTypeBool:
		switch value.(type) {
		case string:
			// try to convert the string value to to number
			tblFieldName = fmt.Sprintf(`toString(%s)`, tblFieldName)
		}
	}
	return tblFieldName, value
}
