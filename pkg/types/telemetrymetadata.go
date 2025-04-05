package types

import (
	"context"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/huandu/go-sqlbuilder"
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

// FieldContext is the context of the field. It is expected to be used to disambiguate b/w
// different contexts of the same field.
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

type FieldKeySelectorType string

const (
	FieldKeySelectorTypeExact FieldKeySelectorType = "exact"
	FieldKeySelectorTypeFuzzy FieldKeySelectorType = "fuzzy"
)

type TelemetryFieldKey struct {
	Name          string        `json:"name"`
	Description   string        `json:"description"`
	Unit          string        `json:"unit"`
	Signal        Signal        `json:"signal"`
	FieldContext  FieldContext  `json:"fieldContext"`
	FieldDataType FieldDataType `json:"fieldDataType"`
	Materialized  bool          `json:"-"`
}

type ExistingFieldSelection struct {
	Key   TelemetryFieldKey `json:"key"`
	Value any               `json:"value"`
}

type MetricContext struct {
	MetricName string `json:"metricName"`
}

type FieldKeySelector struct {
	StartUnixMilli int64                `json:"startUnixMilli"`
	EndUnixMilli   int64                `json:"endUnixMilli"`
	Signal         Signal               `json:"signal"`
	FieldContext   FieldContext         `json:"fieldContext"`
	FieldDataType  FieldDataType        `json:"fieldDataType"`
	Name           string               `json:"name"`
	SelectorType   FieldKeySelectorType `json:"selectorType"`
	Limit          int                  `json:"limit"`
	MetricContext  *MetricContext       `json:"metricContext,omitempty"`
}

type Metadata interface {
	// GetKeys returns a map of field keys by name, there can be multiple keys with the same name
	// if they have different types or data types.
	GetKeys(ctx context.Context, fieldKeySelector FieldKeySelector) (map[string][]TelemetryFieldKey, error)

	GetKeysMulti(ctx context.Context, fieldKeySelectors []FieldKeySelector) (map[string][]TelemetryFieldKey, error)

	// GetKey returns a list of keys with the given name.
	GetKey(ctx context.Context, fieldKeySelector FieldKeySelector) ([]TelemetryFieldKey, error)

	// GetRelatedValues returns a list of related values for the given key name
	// and the existing selection of keys.
	GetRelatedValues(ctx context.Context, fieldKeySelector FieldKeySelector, existingSelections []ExistingFieldSelection) (any, error)

	// GetAllValues returns a list of all values.
	GetAllValues(ctx context.Context, fieldKeySelector FieldKeySelector) (any, error)
}

type ConditionBuilder interface {
	GetColumn(ctx context.Context, key TelemetryFieldKey) (*schema.Column, error)
	GetCondition(ctx context.Context, key TelemetryFieldKey, operator FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)
}
