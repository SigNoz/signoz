package telemetrytypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
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
	// TODO(Piyush): Remove once we've migrated to the new array syntax
	ArrayAnyIndex = "[*]."
)

type TelemetryFieldKey struct {
	Name          string        `json:"name" required:"true"`
	Description   string        `json:"description,omitempty"`
	Unit          string        `json:"unit,omitempty"`
	Signal        Signal        `json:"signal,omitzero"`
	FieldContext  FieldContext  `json:"fieldContext,omitzero"`
	FieldDataType FieldDataType `json:"fieldDataType,omitzero"`

	JSONDataType *JSONDataType       `json:"-"`
	JSONPlan     JSONAccessPlan      `json:"-"`
	Indexes      []JSONDataTypeIndex `json:"-"`
	Materialized bool                `json:"-"` // refers to promoted in case of body.... fields
}

func (f *TelemetryFieldKey) KeyNameContainsArray() bool {
	return strings.Contains(f.Name, ArraySep) || strings.Contains(f.Name, ArrayAnyIndex)
}

// ArrayPathSegments returns just the individual segments of the path
// e.g., "education[].awards[].type" -> ["education", "awards", "type"]
func (f *TelemetryFieldKey) ArrayPathSegments() []string {
	return strings.Split(strings.ReplaceAll(f.Name, ArrayAnyIndex, ArraySep), ArraySep)
}

func (f *TelemetryFieldKey) ArrayParentPaths() []string {
	parts := f.ArrayPathSegments()
	paths := make([]string, 0, len(parts))
	for i := range parts {
		paths = append(paths, strings.Join(parts[:i+1], ArraySep))
	}
	return paths
}

func (f *TelemetryFieldKey) ArrayParentSelectors() []*FieldKeySelector {
	paths := f.ArrayParentPaths()
	selectors := make([]*FieldKeySelector, 0, len(paths))
	for i := range paths {
		selectors = append(selectors, &FieldKeySelector{
			Name:              paths[i],
			SelectorMatchType: FieldSelectorMatchTypeExact,
			Signal:            f.Signal,
			FieldContext:      f.FieldContext,
			Limit:             1,
		})
	}

	return selectors
}

func (f TelemetryFieldKey) String() string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "name=%s", f.Name)
	if f.FieldContext != FieldContextUnspecified {
		fmt.Fprintf(&sb, ",context=%s", f.FieldContext.String)
	}
	if f.FieldDataType != FieldDataTypeUnspecified {
		fmt.Fprintf(&sb, ",datatype=%s", f.FieldDataType.StringValue())
	}
	if f.Materialized {
		sb.WriteString(",materialized=true")
	}
	if f.JSONDataType != nil {
		fmt.Fprintf(&sb, ",jsondatatype=%s", f.JSONDataType.StringValue())
	}
	if len(f.Indexes) > 0 {
		sb.WriteString(",indexes=[")
		for i, index := range f.Indexes {
			if i > 0 {
				sb.WriteString("; ")
			}
			fmt.Fprintf(&sb, "{type=%s, columnExpr=%s, indexExpr=%s}", index.Type.StringValue(), index.ColumnExpression, index.IndexExpression)
		}
		sb.WriteString("]")
	}
	return sb.String()
}

func (f TelemetryFieldKey) Text() string {
	return TelemetryFieldKeyToText(&f)
}

// OverrideMetadataFrom copies the resolved metadata fields from src into f.
// This is used when adjusting user-provided keys to match known field definitions.
func (f *TelemetryFieldKey) OverrideMetadataFrom(src *TelemetryFieldKey) {
	f.FieldContext = src.FieldContext
	f.FieldDataType = src.FieldDataType
	f.JSONDataType = src.JSONDataType
	f.Indexes = src.Indexes
	f.Materialized = src.Materialized
	f.JSONPlan = src.JSONPlan
}

func (f *TelemetryFieldKey) Equal(key *TelemetryFieldKey) bool {
	return f.Name == key.Name &&
		f.FieldContext == key.FieldContext &&
		f.FieldDataType == key.FieldDataType
}

// Normalize parses and normalizes a TelemetryFieldKey by extracting
// the field context and data type from the field name if they are not already specified.
// This function modifies the key in place.
//
// Example:
//
//	key := &TelemetryFieldKey{Name: "resource.service.name:string"}
//	key.Normalize()
//	// Result: Name: "service.name", FieldContext: FieldContextResource, FieldDataType: FieldDataTypeString
func (f *TelemetryFieldKey) Normalize() {

	// Step 1: Parse data type from the right (after the last ":") if not already specified
	if f.FieldDataType == FieldDataTypeUnspecified {
		if colonIdx := strings.LastIndex(f.Name, ":"); colonIdx != -1 {
			potentialDataType := f.Name[colonIdx+1:]
			if dt, ok := fieldDataTypes[potentialDataType]; ok && dt != FieldDataTypeUnspecified {
				f.FieldDataType = dt
				f.Name = f.Name[:colonIdx]
			}
		}
	}

	// Step 2: Parse field context from the left if not already specified
	if f.FieldContext == FieldContextUnspecified {
		if dotIdx := strings.Index(f.Name, "."); dotIdx != -1 {
			potentialContext := f.Name[:dotIdx]
			if fc, ok := fieldContexts[potentialContext]; ok && fc != FieldContextUnspecified {
				f.Name = f.Name[dotIdx+1:]
				f.FieldContext = fc

				// Step 2a: Handle special case for log.body.* fields
				if f.FieldContext == FieldContextLog && strings.HasPrefix(f.Name, BodyJSONStringSearchPrefix) {
					f.FieldContext = FieldContextBody
					f.Name = strings.TrimPrefix(f.Name, BodyJSONStringSearchPrefix)
				}

			}
		}
	}

}

// GetFieldKeyFromKeyText returns a TelemetryFieldKey from a key text.
// The key text is expected to be in the format of `fieldContext.fieldName:fieldDataType` in the search query.
// Both fieldContext and :fieldDataType are optional.
// fieldName can contain dots and can start with a dot (e.g., ".http_code").
// Special cases:
// - When key exactly matches a field context name (e.g., "body", "attribute"), use unspecified context
// - When key starts with "body." prefix, use "body" as context with remainder as field name
func GetFieldKeyFromKeyText(key string) TelemetryFieldKey {
	var explicitFieldDataType FieldDataType = FieldDataTypeUnspecified
	var fieldName string

	// Step 1: Parse data type from the right (after the last ":")
	var keyWithoutDataType string
	if colonIdx := strings.LastIndex(key, ":"); colonIdx != -1 {
		potentialDataType := key[colonIdx+1:]
		if dt, ok := fieldDataTypes[potentialDataType]; ok && dt != FieldDataTypeUnspecified {
			explicitFieldDataType = dt
			keyWithoutDataType = key[:colonIdx]
		} else {
			// No valid data type found, treat the entire key as the field name
			keyWithoutDataType = key
		}
	} else {
		keyWithoutDataType = key
	}

	// Step 2: Parse field context from the left
	if dotIdx := strings.Index(keyWithoutDataType, "."); dotIdx != -1 {
		potentialContext := keyWithoutDataType[:dotIdx]
		if fc, ok := fieldContexts[potentialContext]; ok && fc != FieldContextUnspecified {
			fieldName = keyWithoutDataType[dotIdx+1:]

			// Step 2a: Handle special case for log.body.* fields
			if fc == FieldContextLog && strings.HasPrefix(fieldName, BodyJSONStringSearchPrefix) {
				fc = FieldContextBody
				fieldName = strings.TrimPrefix(fieldName, BodyJSONStringSearchPrefix)
			}

			return TelemetryFieldKey{
				Name:          fieldName,
				FieldContext:  fc,
				FieldDataType: explicitFieldDataType,
			}
		}
	}

	// Step 3: No context found, entire key is the field name
	return TelemetryFieldKey{
		Name:          keyWithoutDataType,
		FieldContext:  FieldContextUnspecified,
		FieldDataType: explicitFieldDataType,
	}
}

func TelemetryFieldKeyToText(key *TelemetryFieldKey) string {
	var sb strings.Builder
	if key.FieldContext != FieldContextUnspecified {
		sb.WriteString(key.FieldContext.StringValue())
		sb.WriteString(".")
	}
	sb.WriteString(key.Name)
	if key.FieldDataType != FieldDataTypeUnspecified {
		sb.WriteString(":")
		sb.WriteString(key.FieldDataType.StringValue())
	}
	return sb.String()
}

func FieldKeyToMaterializedColumnName(key *TelemetryFieldKey) string {
	return fmt.Sprintf("`%s_%s_%s`",
		key.FieldContext.String,
		fieldDataTypes[key.FieldDataType.StringValue()].StringValue(),
		strings.ReplaceAll(key.Name, ".", "$$"),
	)
}

func FieldKeyToMaterializedColumnNameForExists(key *TelemetryFieldKey) string {
	return fmt.Sprintf("`%s_%s_%s_exists`",
		key.FieldContext.String,
		fieldDataTypes[key.FieldDataType.StringValue()].StringValue(),
		strings.ReplaceAll(key.Name, ".", "$$"),
	)
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
	Keys     map[string][]*TelemetryFieldKey `json:"keys" required:"true"`
	Complete bool                            `json:"complete" required:"true"`
}

type PostableFieldKeysParams struct {
	Signal         Signal        `query:"signal"`
	Source         Source        `query:"source"`
	Limit          int           `query:"limit"`
	StartUnixMilli int64         `query:"startUnixMilli"`
	EndUnixMilli   int64         `query:"endUnixMilli"`
	FieldContext   FieldContext  `query:"fieldContext"`
	FieldDataType  FieldDataType `query:"fieldDataType"`
	MetricName     string        `query:"metricName"`
	SearchText     string        `query:"searchText"`
}

type GettableFieldValues struct {
	Values   *TelemetryFieldValues `json:"values" required:"true"`
	Complete bool                  `json:"complete" required:"true"`
}

type PostableFieldValueParams struct {
	PostableFieldKeysParams
	Name          string `query:"name"`
	ExistingQuery string `query:"existingQuery"`
}

func NewFieldKeySelectorFromPostableFieldKeysParams(params PostableFieldKeysParams) *FieldKeySelector {
	var req FieldKeySelector

	if params.StartUnixMilli != 0 {
		req.StartUnixMilli = params.StartUnixMilli
		// Round down to the nearest 6 hours (21600000 milliseconds)
		req.StartUnixMilli -= req.StartUnixMilli % 21600000
	}

	if params.EndUnixMilli != 0 {
		req.EndUnixMilli = params.EndUnixMilli
	}

	req.Signal = params.Signal
	req.Source = params.Source
	req.FieldContext = params.FieldContext
	req.FieldDataType = params.FieldDataType
	req.SelectorMatchType = FieldSelectorMatchTypeFuzzy

	if params.Limit != 0 {
		req.Limit = params.Limit
	} else {
		req.Limit = 1000
	}

	if params.MetricName != "" {
		req.MetricContext = &MetricContext{
			MetricName: params.MetricName,
		}
	}

	req.Name = params.SearchText
	if params.SearchText != "" && params.FieldContext == FieldContextUnspecified {
		parsedFieldKey := GetFieldKeyFromKeyText(params.SearchText)
		if parsedFieldKey.FieldContext != FieldContextUnspecified {
			// Only apply inferred context if it is valid for the current signal
			if isContextValidForSignal(parsedFieldKey.FieldContext, req.Signal) {
				req.Name = parsedFieldKey.Name
				req.FieldContext = parsedFieldKey.FieldContext
			}
		}
	}

	return &req
}

func NewFieldValueSelectorFromPostableFieldValueParams(params PostableFieldValueParams) *FieldValueSelector {

	keySelector := NewFieldKeySelectorFromPostableFieldKeysParams(params.PostableFieldKeysParams)

	fieldValueSelector := &FieldValueSelector{
		FieldKeySelector: keySelector,
	}

	fieldValueSelector.Name = params.Name

	if params.Name != "" && fieldValueSelector.FieldContext == FieldContextUnspecified {
		parsedFieldKey := GetFieldKeyFromKeyText(params.Name)
		if parsedFieldKey.FieldContext != FieldContextUnspecified {
			// Only apply inferred context if it is valid for the current signal
			if isContextValidForSignal(parsedFieldKey.FieldContext, fieldValueSelector.Signal) {
				fieldValueSelector.Name = parsedFieldKey.Name
				fieldValueSelector.FieldContext = parsedFieldKey.FieldContext
			}
		}
	}

	fieldValueSelector.ExistingQuery = params.ExistingQuery
	fieldValueSelector.Value = params.SearchText

	if params.Limit != 0 {
		fieldValueSelector.Limit = params.Limit
	} else {
		fieldValueSelector.Limit = 50
	}

	return fieldValueSelector
}
