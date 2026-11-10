package telemetrytypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
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
	// BodyJSONStringSearchPrefix is the prefix used for body JSON search queries.
	// e.g., "body.status" where "body." is the prefix.
	BodyJSONStringSearchPrefix = "body."
	// ArraySep must match the array separator written by the collector's JSON
	// type exporter; the shared constant (jsontypeexporter.ArraySeparator) was
	// removed from signoz-otel-collector, so the value is duplicated here.
	ArraySep       = "[]."
	ArraySepSuffix = "[]"
	// TODO(Piyush): Remove once we've migrated to the new array syntax.
	ArrayAnyIndex       = "[*]."
	ArrayAnyIndexSuffix = "[*]"
)

type TelemetryFieldKey struct {
	Name        string `json:"name" validate:"required" required:"true" description:"The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested."`
	Description string `json:"description,omitempty" description:"Human-readable summary of the field, present only for well-known fields."`
	Unit        string `json:"unit,omitempty" description:"Unit of the field values, present only for well-known fields."`
	// signal/fieldContext/fieldDataType always serialize (empty included): the empty
	// value is a first-class "unspecified / any" selection a client can set, so it
	// must round-trip verbatim rather than be dropped. Their Enum()s include the
	// empty member so the "" is a valid schema value.
	Signal        Signal        `json:"signal" description:"The signal the field belongs to: traces, logs or metrics. Empty means any signal."`
	FieldContext  FieldContext  `json:"fieldContext" description:"Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it."`
	FieldDataType FieldDataType `json:"fieldDataType" description:"Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified."`

	JSONPlan     JSONAccessPlan               `json:"-"`
	Indexes      []TelemetryFieldKeySkipIndex `json:"-"`
	Materialized bool                         `json:"-"` // refers to promoted in case of body.... fields

	Evolutions []*EvolutionEntry `json:"-"`
}

func (f *TelemetryFieldKey) KeyNameContainsArray() bool {
	return strings.Contains(f.Name, ArraySep) || strings.Contains(f.Name, ArrayAnyIndex)
}

// ArrayPathSegments returns just the individual segments of the path.
// e.g., "education[].awards[].type" -> ["education", "awards", "type"].
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

// GetJSONDataType derives the JSONDataType from FieldDataType.
func (f *TelemetryFieldKey) GetJSONDataType() JSONDataType {
	return MappingFieldDataTypeToJSONDataType[f.FieldDataType]
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
	if len(f.Indexes) > 0 {
		sb.WriteString(",indexes=[")
		for i, index := range f.Indexes {
			if i > 0 {
				sb.WriteString("; ")
			}
			fmt.Fprintf(&sb, "{type=%s, indexExpr=%s}", MappingFieldDataTypeToJSONDataType[index.FieldDataType].StringValue(), index.IndexExpression)
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
	f.Indexes = src.Indexes
	f.Materialized = src.Materialized
	f.JSONPlan = src.JSONPlan
	f.Evolutions = src.Evolutions
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

// GetFieldKeyFromKeyText returns a TelemetryFieldKey parsed from a key text of the
// form `fieldContext.fieldName:fieldDataType` (context and :dataType optional). It
// delegates to Normalize; see Normalize for the parsing rules and special cases.
func GetFieldKeyFromKeyText(key string) TelemetryFieldKey {
	f := TelemetryFieldKey{Name: key}
	f.Normalize()
	return f
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
	return clickhousesql.Identifier(fmt.Sprintf("%s_%s_%s",
		key.FieldContext.String,
		fieldDataTypes[key.FieldDataType.StringValue()].StringValue(),
		strings.ReplaceAll(key.Name, ".", "$$"),
	))
}

func FieldKeyToMaterializedColumnNameForExists(key *TelemetryFieldKey) string {
	return clickhousesql.Identifier(fmt.Sprintf("%s_%s_%s_exists",
		key.FieldContext.String,
		fieldDataTypes[key.FieldDataType.StringValue()].StringValue(),
		strings.ReplaceAll(key.Name, ".", "$$"),
	))
}

// FieldKeyToMaterializedExistsCondition compares the exists column explicitly: a bare bool
// column defeats skip-index pruning across OR.
func FieldKeyToMaterializedExistsCondition(key *TelemetryFieldKey, exists bool) string {
	return fmt.Sprintf("%s = %t", FieldKeyToMaterializedColumnNameForExists(key), exists)
}

type TelemetryFieldValues struct {
	StringValues  []string  `json:"stringValues,omitempty" description:"Distinct string values of the field, up to limit."`
	BoolValues    []bool    `json:"boolValues,omitempty" description:"Distinct boolean values of the field."`
	NumberValues  []float64 `json:"numberValues,omitempty" description:"Distinct numeric values of the field, up to limit."`
	RelatedValues []string  `json:"relatedValues,omitempty" description:"Values of the field seen on data that also matches existingQuery, within the startUnixMilli and endUnixMilli bounds. Empty when existingQuery is not set."`
}

func (t *TelemetryFieldValues) NumValues() int {
	return len(t.StringValues) + len(t.BoolValues) + len(t.NumberValues)
}

type MetricContext struct {
	MetricName      string `json:"metricName" description:"Restricts keys and values to those seen on this metric. Metrics signal only."`
	MetricNamespace string `json:"metricNamespace,omitempty" description:"Restricts keys and values to metrics in this namespace. Metrics signal only."`
}

type FieldKeySelector struct {
	StartUnixMilli    int64                  `json:"startUnixMilli" description:"Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Zero means no lower bound."`
	EndUnixMilli      int64                  `json:"endUnixMilli" description:"End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Zero means no upper bound."`
	Signal            Signal                 `json:"signal" description:"The signal to look up keys in: traces, logs or metrics. Empty means every signal."`
	Source            Source                 `json:"source" description:"The data source within the signal. Use meter for Cost Meter metrics; empty means the default source."`
	FieldContext      FieldContext           `json:"fieldContext" description:"Restricts keys to one context such as resource or attribute. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context."`
	FieldDataType     FieldDataType          `json:"fieldDataType" description:"Restricts keys to one data type such as string or float64. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type."`
	Name              string                 `json:"name" description:"Key name to match; empty matches every key. Matched according to selectorMatchType."`
	SelectorMatchType FieldSelectorMatchType `json:"selectorMatchType" description:"How name is matched: exact (case-sensitive equality) or fuzzy (case-insensitive substring, except the meter source where it is case-sensitive and % and _ act as wildcards). The API always uses fuzzy."`
	Limit             int                    `json:"limit" description:"Maximum number of keys per signal. Intrinsic and materialized fields are added on top, and an unspecified signal applies the limit to traces, logs and metrics separately, so the result can exceed it."`
	MetricContext     *MetricContext         `json:"metricContext,omitempty" description:"Scopes the lookup to one metric or metric namespace. Metrics signal only."`
}

// MatchesKey reports whether a statically defined key satisfies the selector, so
// callers can suggest keys that were never ingested.
func (s *FieldKeySelector) MatchesKey(key *TelemetryFieldKey) bool {
	if s.FieldContext != FieldContextUnspecified && s.FieldContext != key.FieldContext {
		return false
	}

	if s.FieldDataType != FieldDataTypeUnspecified && s.FieldDataType != key.FieldDataType {
		return false
	}

	if s.Name == "" {
		return true
	}

	if s.SelectorMatchType == FieldSelectorMatchTypeExact {
		return strings.EqualFold(s.Name, key.Name)
	}
	return strings.Contains(strings.ToLower(key.Name), strings.ToLower(s.Name))
}

type FieldValueSelector struct {
	*FieldKeySelector
	ExistingQuery string `json:"existingQuery" description:"Filter expression already applied in the explorer. Used to compute relatedValues; empty disables them."`
	Value         string `json:"value" description:"Substring the returned values must contain, case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. Empty returns any value."`
	Limit         int    `json:"limit" description:"Maximum number of values to return."`
}

type GettableFieldKeys struct {
	Keys     map[string][]*TelemetryFieldKey `json:"keys" required:"true" description:"Matching keys grouped by name. A name maps to several entries when it exists in more than one context or data type."`
	Complete bool                            `json:"complete" required:"true" description:"True when every matching key was returned; false when the result was cut off by limit."`
}

type PostableFieldKeysParams struct {
	Signal          Signal        `query:"signal" description:"The signal to look up keys in: traces, logs or metrics. Empty searches every signal."`
	Source          Source        `query:"source" description:"The data source within the signal. Use meter for Cost Meter metrics; empty means the default source."`
	Limit           int           `query:"limit" description:"Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it."`
	StartUnixMilli  int64         `query:"startUnixMilli" description:"Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound."`
	EndUnixMilli    int64         `query:"endUnixMilli" description:"End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound."`
	FieldContext    FieldContext  `query:"fieldContext" description:"Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context."`
	FieldDataType   FieldDataType `query:"fieldDataType" description:"Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type."`
	MetricName      string        `query:"metricName" description:"Restricts keys to those seen on this metric. Metrics signal only."`
	MetricNamespace string        `query:"metricNamespace" description:"Restricts keys to metrics in this namespace. Metrics signal only."`
	SearchText      string        `query:"searchText" description:"Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty."`
}

type GettableFieldValues struct {
	Values   *TelemetryFieldValues `json:"values" required:"true" description:"Distinct values of the key, split by data type."`
	Complete bool                  `json:"complete" required:"true" description:"True when every matching value was returned; false when the result was cut off by limit."`
}

type PostableFieldValueParams struct {
	PostableFieldKeysParams
	Name          string `query:"name" description:"The key whose values to return, such as service.name. A context prefix such as resource.service.name sets fieldContext when it is empty."`
	ExistingQuery string `query:"existingQuery" description:"Filter expression already applied in the explorer. When set, relatedValues lists the values seen on data matching it."`
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

	if params.MetricName != "" || params.MetricNamespace != "" {
		req.MetricContext = &MetricContext{
			MetricName:      params.MetricName,
			MetricNamespace: params.MetricNamespace,
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

func NewTelemetryFieldKey(name string, fieldContext FieldContext, fieldDataType FieldDataType) *TelemetryFieldKey {
	return &TelemetryFieldKey{
		Name:          name,
		FieldContext:  fieldContext,
		FieldDataType: fieldDataType,
	}
}

// JSONIndexLookup locates one domain's JSON sub-column indexes in
// system.data_skipping_indices: the table to read, the base and promoted
// column prefixes to match index expressions against, and the signal and
// context to stamp on the results.
type JSONIndexLookup struct {
	Signal               Signal
	FieldContext         FieldContext
	DBName               string
	LocalTableName       string
	BaseColumnPrefix     string
	PromotedColumnPrefix string
}

type TelemetryFieldKeySkipIndex struct {
	Name            string        `json:"name"` // Name is TelemetryFieldKey.Name not IndexName from ClickHouse
	FieldContext    FieldContext  `json:"fieldContext,omitzero"`
	FieldDataType   FieldDataType `json:"fieldDataType,omitzero"`
	BaseColumn      string        `json:"baseColumn"`
	IndexName       string        `json:"indexName"`
	IndexType       string        `json:"indexType"`
	IndexExpression string        `json:"indexExpression"`
	Granularity     int           `json:"granularity"`
}
