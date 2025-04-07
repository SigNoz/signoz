package types

import (
	"context"
	"errors"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/qbtypes/v5"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrColumnNotFound = errors.New("column not found")
	ErrBetweenValues  = errors.New("(not) between operator requires two values")
	ErrInValues       = errors.New("(not) in operator requires a list of values")
)

// Signal is the signal of the telemetry data.
type Signal string

const (
	SignalTraces      Signal = "traces"
	SignalLogs        Signal = "logs"
	SignalMetrics     Signal = "metrics"
	SignalUnspecified Signal = ""
)

func (s Signal) String() string {
	return string(s)
}

func (s Signal) Validate() error {
	switch s {
	case SignalTraces, SignalLogs, SignalMetrics:
		return nil
	default:
		return fmt.Errorf("invalid signal: %s", s)
	}
}

// FieldContext is the context of the field. It is expected to be used to disambiguate b/w
// different contexts of the same field.
//
// - Use `resource.` prefix to the key to explicitly indicate and enforce resource context. Example
//   - `resource.service.name`
//   - `resource.k8s.namespace.name`
//
// - Use `scope.` prefix to explicitly indicate and enforce scope context. Example
//   - `scope.name`
//   - `scope.version`
//   - `scope.my.custome.attribute` and `scope.attribute.my.custome.attribute` resolve to same attribute
//
// - Use `attribute.` to explicitly indicate and enforce attribute context. Example
//   - `attribute.http.method`
//   - `attribute.http.target`
//
// - Use `event.` to indicate and enforce event context and `event.attribute` to disambiguate b/w `event.name` and `event.attribute.name` . Examples
//   - `event.name` will look for event name
//   - `event.record_entry` will look for `record_entry` attribute in event
//   - `event.attribute.name` will look for `name` attribute event
//
// - Use `span.` to indicate the span context.
//   - `span.name` will resolve to the name of span
//   - `span.kind` will resolve to the kind of span
//   - `span.http.method` will resolve to `http.method` of attribute
//
// - Use `log.` for explicit log context
//   - `log.severity_text` will always resolve to `severity_text` of log record
type FieldContext string

const (
	FieldContextMetric      FieldContext = "metric"
	FieldContextLog         FieldContext = "log"
	FieldContextSpan        FieldContext = "span"
	FieldContextTrace       FieldContext = "trace"
	FieldContextResource    FieldContext = "resource"
	FieldContextScope       FieldContext = "scope"
	FieldContextAttribute   FieldContext = "attribute"
	FieldContextEvent       FieldContext = "event"
	FieldContextUnspecified FieldContext = ""
)

func (f FieldContext) String() string {
	return string(f)
}

// FieldContextToTagType converts the field context to the tag type.
// We have historically used the term "tag" to refer to the {span/log/metric} attributes of the telemetry data.
// Going forward, we will use the term "attribute" to refer to the {span/log/metric} attributes of the telemetry data.
func FieldContextToTagType(f FieldContext) string {
	switch f {
	case FieldContextResource:
		return "resource"
	case FieldContextScope:
		return "scope"
	case FieldContextAttribute:
		return "tag"
	case FieldContextLog:
		return "logfield"
	case FieldContextSpan:
		return "spanfield"
	case FieldContextTrace:
		return "tracefield"
	case FieldContextMetric:
		return "metricfield"
	case FieldContextEvent:
		return "eventfield"
	}
	return ""
}

// FieldContextFromString converts the string to the field context.
func FieldContextFromString(s string) FieldContext {
	switch s {
	case "resource":
		return FieldContextResource
	case "scope":
		return FieldContextScope
	case "tag", "attribute":
		return FieldContextAttribute
	case "event":
		return FieldContextEvent
	case "spanfield", "span":
		return FieldContextSpan
	case "logfield", "log":
		return FieldContextLog
	case "metric":
		return FieldContextMetric
	default:
		return FieldContextUnspecified
	}
}

// FieldDataType is the data type of the field. It is expected to be used to disambiguate b/w
// different data types of the same field.
type FieldDataType string

const (
	FieldDataTypeString  FieldDataType = "string"
	FieldDataTypeBool    FieldDataType = "bool"
	FieldDataTypeFloat64 FieldDataType = "float64"
	// int64 and number are synonyms for float64
	FieldDataTypeInt64       FieldDataType = "int64"
	FieldDataTypeNumber      FieldDataType = "number"
	FieldDataTypeUnspecified FieldDataType = ""
)

func (f FieldDataType) String() string {
	switch f {
	case FieldDataTypeNumber, FieldDataTypeInt64, FieldDataTypeFloat64:
		return string(FieldDataTypeFloat64)
	default:
		return string(f)
	}
}

func FieldDataTypeFromString(s string) FieldDataType {
	switch strings.ToLower(s) {
	case "string":
		return FieldDataTypeString
	case "bool":
		return FieldDataTypeBool
	case "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64":
		return FieldDataTypeNumber
	case "float", "float64", "double", "float32", "decimal":
		return FieldDataTypeNumber
	case "number":
		return FieldDataTypeNumber
	default:
		return FieldDataTypeUnspecified
	}
}

// FieldDataTypeToTagDataType converts the field data type to the tag data type.
// This is used to convert the field data type to the tag data type for the telemetry data.
func FieldDataTypeToTagDataType(f FieldDataType) string {
	switch f {
	case FieldDataTypeString:
		return "string"
	case FieldDataTypeBool:
		return "bool"
	case FieldDataTypeNumber, FieldDataTypeInt64, FieldDataTypeFloat64:
		return "float64"
	default:
		return ""
	}
}

func DataTypeCollisionHandledFieldName(key TelemetryFieldKey, value any, tblFieldName string) (string, any) {
	// This block of code exists to handle the data type collisions
	// We don't want to fail the requests when there is a key with more than one data type
	// Let's take an example of `http.status_code`, and consider user sent a string value and number value
	// When they search for `http.status_code=200`, we will search across both the number columns and string columns
	// and return the results from both the columns
	// While we expect user not to send the mixed data types, it invetably happens
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

// FieldSelectorMatchType is the match type of the field key selector.
type FieldSelectorMatchType string

const (
	FieldSelectorMatchTypeExact FieldSelectorMatchType = "exact"
	FieldSelectorMatchTypeFuzzy FieldSelectorMatchType = "fuzzy"
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

func GetFieldKeyFromString(key string) TelemetryFieldKey {

	keyTextParts := strings.Split(key, ".")

	var explicitFieldContextProvided, explicitFieldDataTypeProvided bool
	var explicitFieldContext FieldContext
	var explicitFieldDataType FieldDataType

	if len(keyTextParts) > 1 {
		explicitFieldContext = FieldContextFromString(keyTextParts[0])
		if explicitFieldContext != FieldContextUnspecified {
			explicitFieldContextProvided = true
		}
	}

	if explicitFieldContextProvided {
		keyTextParts = keyTextParts[1:]
	}

	// check if there is a field data type provided
	if len(keyTextParts) > 1 {
		lastPart := keyTextParts[len(keyTextParts)-1]
		lastPartParts := strings.Split(lastPart, ":")
		if len(lastPartParts) > 1 {
			explicitFieldDataType = FieldDataTypeFromString(lastPartParts[1])
			if explicitFieldDataType != FieldDataTypeUnspecified {
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

func FieldKeyToMaterializedColumnName(key TelemetryFieldKey) string {
	return fmt.Sprintf("%s_%s_%s", key.FieldContext, key.FieldDataType.String(), strings.ReplaceAll(key.Name, ".", "$$"))
}

func FieldKeyToMaterializedColumnNameForExists(key TelemetryFieldKey) string {
	return fmt.Sprintf("%s_%s_%s_exists", key.FieldContext, key.FieldDataType.String(), strings.ReplaceAll(key.Name, ".", "$$"))
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
	FieldKeySelector
	ExistingQuery string `json:"existingQuery"`
	Value         string `json:"value"`
	Limit         int    `json:"limit"`
}

// Metadata is the interface for the telemetry metadata.
type Metadata interface {
	// GetKeys returns a map of field keys types.TelemetryFieldKey by name, there can be multiple keys with the same name
	// if they have different types or data types.
	GetKeys(ctx context.Context, fieldKeySelector FieldKeySelector) (map[string][]TelemetryFieldKey, error)

	// GetKeys but with any number of fieldKeySelectors.
	GetKeysMulti(ctx context.Context, fieldKeySelectors []FieldKeySelector) (map[string][]TelemetryFieldKey, error)

	// GetKey returns a list of keys with the given name.
	GetKey(ctx context.Context, fieldKeySelector FieldKeySelector) ([]TelemetryFieldKey, error)

	// GetRelatedValues returns a list of related values for the given key name
	// and the existing selection of keys.
	GetRelatedValues(ctx context.Context, fieldValueSelector FieldValueSelector) ([]string, error)

	// GetAllValues returns a list of all values.
	GetAllValues(ctx context.Context, fieldValueSelector FieldValueSelector) (*TelemetryFieldValues, error)
}

// ConditionBuilder is the interface for building the condition part of the query.
type ConditionBuilder interface {
	// GetColumn returns the column for the given key.
	GetColumn(ctx context.Context, key TelemetryFieldKey) (*schema.Column, error)

	// GetTableFieldName returns the table field name for the given key.
	GetTableFieldName(ctx context.Context, key TelemetryFieldKey) (string, error)

	// GetCondition returns the condition for the given key, operator and value.
	GetCondition(ctx context.Context, key TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)
}
