package telemetrytypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
	"github.com/SigNoz/signoz/pkg/errors"
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

const (
	// BodyJSONStringSearchPrefix is the prefix used for body JSON search queries
	// e.g., "body.status" where "body." is the prefix
	BodyJSONStringSearchPrefix = "body."
	ArraySep                   = jsontypeexporter.ArraySeparator
	ArrayAnyIndex              = "[*]."
)

type TelemetryFieldKey struct {
	Name          string        `json:"name"`
	Description   string        `json:"description,omitempty"`
	Unit          string        `json:"unit,omitempty"`
	Signal        Signal        `json:"signal,omitempty"`
	FieldContext  FieldContext  `json:"fieldContext,omitempty"`
	FieldDataType FieldDataType `json:"fieldDataType,omitempty"`

	JSONDataType *JSONDataType       `json:"-"`
	Indexes      []JSONDataTypeIndex `json:"-"`
	Materialized bool                `json:"-"` // refers to promoted in case of body.... fields
}

func (f TelemetryFieldKey) String() string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("name=%s", f.Name))
	if f.FieldContext != FieldContextUnspecified {
		sb.WriteString(fmt.Sprintf(",context=%s", f.FieldContext.String))
	}
	if f.FieldDataType != FieldDataTypeUnspecified {
		sb.WriteString(fmt.Sprintf(",datatype=%s", f.FieldDataType.StringValue()))
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

func (t *TelemetryFieldValues) NumValues() int {
	return len(t.StringValues) + len(t.BoolValues) + len(t.NumberValues)
}

type MetricContext struct {
	MetricName string `json:"metricName"`
}

type FieldKeySelector struct {
	StartUnixMilli    int64                  `json:"startUnixMilli"`
	EndUnixMilli      int64                  `json:"endUnixMilli"`
	Signal            Signal                 `json:"signal"`
	Source            Source                 `json:"source"`
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


type GettableFieldKeys struct {
	Keys     map[string][]*TelemetryFieldKey `json:"keys"`
	Complete bool                            `json:"complete"`
}

type PostableFieldKeysParams struct {
	Signal Signal `query:"signal"`
	Source Source `query:"source"`
	Limit  int    `query:"limit"`
	StartUnixMilli int64 `query:"startUnixMilli"`
	EndUnixMilli int64 `query:"endUnixMilli"`
	FieldContext FieldContext `query:"fieldContext"`
	FieldDataType FieldDataType `query:"fieldDataType"`
	MetricContext *MetricContext `query:"metricContext"`
	Name string `query:"name"`
	SearchText string `query:"searchText"`
}

type GettableFieldValues struct {
	Values   *TelemetryFieldValues `json:"values"`
	Complete bool                  `json:"complete"`
}

type PostableFieldValueParams struct {
	PostableFieldKeysParams
	ExistingQuery string `query:"existingQuery"`
}

func NewFieldKeySelectorFromPostableFieldKeysParams(params PostableFieldKeysParams) (*FieldKeySelector, error) {
	var req FieldKeySelector
	var signal Signal

	if params.Limit != 0 {
		req.Limit = params.Limit
	} else {
		req.Limit = 1000
	}

	if params.StartUnixMilli != 0 {
		req.StartUnixMilli = params.StartUnixMilli
		// Round down to the nearest 6 hours (21600000 milliseconds)
		req.StartUnixMilli -= req.StartUnixMilli % 21600000
	}

	if params.EndUnixMilli != 0 {
		req.EndUnixMilli = params.EndUnixMilli
	}

	if params.SearchText != "" && params.FieldContext == FieldContextUnspecified {
		parsedFieldKey := GetFieldKeyFromKeyText(params.SearchText )
		if parsedFieldKey.FieldContext != FieldContextUnspecified {
			// Only apply inferred context if it is valid for the current signal
			if isContextValidForSignal(parsedFieldKey.FieldContext, signal) {
				req.Name = parsedFieldKey.Name
				req.FieldContext = parsedFieldKey.FieldContext
			}
		}
	}

	return &req, nil
}

func NewFieldValueSelectorFromPostableFieldValueParams(params PostableFieldValueParams) (*FieldValueSelector, error) {
	var fieldValueSelector FieldValueSelector

	keySelector, err := NewFieldKeySelectorFromPostableFieldKeysParams(params.PostableFieldKeysParams)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse field key request").WithAdditional(err.Error())
	}

	if params.Name != "" && keySelector.FieldContext == FieldContextUnspecified {
		parsedFieldKey := GetFieldKeyFromKeyText(params.Name)
		if parsedFieldKey.FieldContext != FieldContextUnspecified {
			// Only apply inferred context if it is valid for the current signal
			if isContextValidForSignal(parsedFieldKey.FieldContext, keySelector.Signal) {
				fieldValueSelector.Name = parsedFieldKey.Name
				keySelector.FieldContext = parsedFieldKey.FieldContext
			}
		}
	}

	keySelector.Name = fieldValueSelector.Name
	fieldValueSelector.ExistingQuery = params.ExistingQuery
	fieldValueSelector.Value = params.SearchText


	if params.Limit != 0 {
		fieldValueSelector.Limit = params.Limit
	} else {
		fieldValueSelector.Limit = 50
	}

	return &fieldValueSelector, nil
}