package logstelemetryschema

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/huandu/go-sqlbuilder"
)

func parseStrValue(valueStr string, operator qbtypes.FilterOperator) (telemetrytypes.FieldDataType, any) {

	valueType := telemetrytypes.FieldDataTypeString

	// return the value as is for the following operators
	// as they are always string
	if operator == qbtypes.FilterOperatorContains || operator == qbtypes.FilterOperatorNotContains ||
		operator == qbtypes.FilterOperatorRegexp || operator == qbtypes.FilterOperatorNotRegexp ||
		operator == qbtypes.FilterOperatorLike || operator == qbtypes.FilterOperatorNotLike ||
		operator == qbtypes.FilterOperatorILike || operator == qbtypes.FilterOperatorNotILike {
		return valueType, valueStr
	}

	var err error
	var parsedValue any
	if parsedValue, err = strconv.ParseInt(valueStr, 10, 64); err == nil {
		valueType = telemetrytypes.FieldDataTypeInt64
	} else if parsedValue, err = strconv.ParseFloat(valueStr, 64); err == nil {
		valueType = telemetrytypes.FieldDataTypeFloat64
	} else if parsedValue, err = strconv.ParseBool(valueStr); err == nil {
		valueType = telemetrytypes.FieldDataTypeBool
	} else {
		parsedValue = valueStr
		valueType = telemetrytypes.FieldDataTypeString
	}

	return valueType, parsedValue
}

func InferDataType(value any, operator qbtypes.FilterOperator, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any) {
	if operator.IsArrayOperator() && reflect.ValueOf(value).Kind() != reflect.Slice {
		value = []any{value}
	}

	// closure to calculate the data type of the value
	var closure func(value any, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any)
	closure = func(value any, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any) {
		// check if the value is a int, float, string, bool
		valueType := telemetrytypes.FieldDataTypeUnspecified
		switch v := value.(type) {
		case []any:
			// take the first element and infer the type
			var scalerType telemetrytypes.FieldDataType
			if len(v) > 0 {
				// Note: [[...]] Slices inside Slices are not handled yet
				if reflect.ValueOf(v[0]).Kind() == reflect.Slice {
					return telemetrytypes.FieldDataTypeUnspecified, value
				}

				scalerType, _ = closure(v[0], key)
			}

			arrayType := telemetrytypes.ScalerFieldTypeToArrayFieldType[scalerType]
			switch {
			// decide on the field data type based on the key
			case key.FieldDataType.IsArray():
				return arrayType, v
			default:
				// TODO(Piyush): backward compatibility for the old String based JSON QB queries
				if strings.HasSuffix(key.Name, telemetrytypes.ArrayAnyIndexSuffix) {
					return arrayType, v
				}
				return scalerType, v
			}
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
			valueType = telemetrytypes.FieldDataTypeInt64
		case float32, float64:
			valueType = telemetrytypes.FieldDataTypeFloat64
		case string:
			valueType, value = parseStrValue(v, operator)
		case bool:
			valueType = telemetrytypes.FieldDataTypeBool
		}

		return valueType, value
	}

	// calculate the data type of the value
	return closure(value, key)
}

// likePatternLiterals returns the runs of pattern between unescaped wildcards, with `\` escapes
// resolved; every value the pattern matches holds each run verbatim. ClickHouse treats `\` as an
// escape only before `%`, `_` and itself, so dropping it elsewhere would yield a run it never requires.
func likePatternLiterals(pattern string) []string {
	var (
		literals []string
		run      strings.Builder
	)
	for i := 0; i < len(pattern); i++ {
		switch c := pattern[i]; c {
		case '%', '_':
			if run.Len() > 0 {
				literals = append(literals, run.String())
				run.Reset()
			}
		case '\\':
			if i+1 >= len(pattern) {
				run.WriteByte('\\')
				continue
			}
			i++
			if escaped := pattern[i]; escaped != '%' && escaped != '_' && escaped != '\\' {
				run.WriteByte('\\')
			}
			run.WriteByte(pattern[i])
		default:
			run.WriteByte(c)
		}
	}
	if run.Len() > 0 {
		literals = append(literals, run.String())
	}
	return literals
}

// jsonEscapable reports whether a JSON encoder is free to rewrite r: `"` and `\` always, `/` by
// PHP, `<` `>` `&` by Go, non-printable ASCII by Python's ensure_ascii. The legacy body holds the
// producer's own text, so a literal spanning one of these may not be there to find.
func jsonEscapable(r rune) bool {
	return r < 0x20 || r > 0x7e || strings.ContainsRune(`"\/<>&`, r)
}

// jsonTextRuns splits s at every byte an encoder may rewrite. A body whose JSON holds s contains
// each returned run verbatim, in order.
func jsonTextRuns(s string) []string {
	return strings.FieldsFunc(s, jsonEscapable)
}

// bodyPathLiterals returns one literal per component of key's JSON path, quoted the way JSON writes
// an object key. A component holding a byte an encoder may rewrite is dropped; JSON writes a parent
// first, so the order carries.
func bodyPathLiterals(key *telemetrytypes.TelemetryFieldKey) []string {
	var literals []string
	for _, part := range strings.Split(key.Name, ".") {
		if idx := strings.Index(part, "["); idx >= 0 {
			part = part[:idx]
		}
		if literal := `"` + part + `"`; !strings.ContainsFunc(part, jsonEscapable) {
			literals = append(literals, literal)
		}
	}
	return literals
}

// bodyValueLiterals returns the literals a comparison implies in the body text. Only string
// comparisons qualify: a number is compared after JSONExtract parses it, which reads 1.23e2
// as 123, so the digits of the filter value need not appear in the body at all.
func bodyValueLiterals(operator qbtypes.FilterOperator, value any) []string {
	str, ok := value.(string)
	if !ok {
		return nil
	}
	switch operator {
	case qbtypes.FilterOperatorEqual, qbtypes.FilterOperatorContains:
		return jsonTextRuns(str)
	case qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike:
		var literals []string
		for _, literal := range likePatternLiterals(str) {
			literals = append(literals, jsonTextRuns(literal)...)
		}
		return literals
	}
	return nil
}

// escapeLikeLiteral escapes the LIKE metacharacters so s matches as literal text. Backslash
// goes first, being the escape character itself.
func escapeLikeLiteral(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, "%", `\%`)
	return strings.ReplaceAll(s, "_", `\_`)
}

// bodyIndexPredicate asserts the raw body text holds the literals in order. ILike renders as
// LOWER(body) LIKE LOWER(?) on the ClickHouse flavor — the expression both bloom filters index.
// They are plain text and backslash-free by construction, so only the LIKE wildcards need escaping.
func bodyIndexPredicate(literals []string, sb *sqlbuilder.SelectBuilder) string {
	if len(literals) == 0 {
		return ""
	}
	escaped := make([]string, 0, len(literals))
	for _, literal := range literals {
		escaped = append(escaped, escapeLikeLiteral(literal))
	}
	pattern := "%" + strings.Join(escaped, "%") + "%"
	return sb.ILike(LogsV2BodyColumn, pattern)
}

func getBodyJSONPath(key *telemetrytypes.TelemetryFieldKey) string {
	parts := strings.Split(key.Name, ".")
	newParts := []string{}
	for _, part := range parts {
		if strings.HasSuffix(part, "[*]") {
			newParts = append(newParts, fmt.Sprintf(`"%s"[*]`, strings.TrimSuffix(part, "[*]")))
		} else if strings.HasSuffix(part, "[]") {
			newParts = append(newParts, fmt.Sprintf(`"%s"[*]`, strings.TrimSuffix(part, "[]")))
		} else {
			newParts = append(newParts, fmt.Sprintf(`"%s"`, part))
		}
	}
	return strings.Join(newParts, ".")
}

func GetBodyJSONKey(_ context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any) (string, any) {
	dataType, value := InferDataType(value, operator, key)

	// for array types, we need to extract the value from the JSON_QUERY
	if dataType == telemetrytypes.FieldDataTypeArrayInt64 ||
		dataType == telemetrytypes.FieldDataTypeArrayFloat64 ||
		dataType == telemetrytypes.FieldDataTypeArrayString ||
		dataType == telemetrytypes.FieldDataTypeArrayBool ||
		dataType == telemetrytypes.FieldDataTypeArrayNumber {
		return fmt.Sprintf("JSONExtract(JSON_QUERY(body, '$.%s'), '%s')", getBodyJSONPath(key), dataType.CHDataType()), value
	}

	if dataType != telemetrytypes.FieldDataTypeString {
		// for all types except strings, we need to extract the value from the JSON_VALUE
		return fmt.Sprintf("JSONExtract(JSON_VALUE(body, '$.%s'), '%s')", getBodyJSONPath(key), dataType.CHDataType()), value
	}
	// JSON_VALUE returns a String; stringify list operands so a numeric element in a mixed
	// set (e.g. IN ['alpha', 42]) doesn't hit a String-vs-number supertype error (CH 386).
	if list, ok := value.([]any); ok {
		strs := make([]any, len(list))
		for i, e := range list {
			strs[i] = fmt.Sprintf("%v", e)
		}
		value = strs
	}
	return fmt.Sprintf("JSON_VALUE(body, '$.%s')", getBodyJSONPath(key)), value
}

func GetBodyJSONKeyForExists(_ context.Context, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) string {
	return fmt.Sprintf("JSON_EXISTS(body, '$.%s')", getBodyJSONPath(key))
}

// legacyElemType infers the has-family element type from the needle (legacy has no schema). It
// scans EVERY value so the chosen array type and all coerced needles agree — else ClickHouse
// raises "no supertype ... String" (code 386). Int64 stays distinct from Float64 so a quoted
// integer is exact past 2^53 (unquoted literals already arrive as float64, parsed upstream).
func legacyElemType(needle any) telemetrytypes.FieldDataType {
	list, ok := needle.([]any)
	if !ok {
		list = []any{needle}
	}
	if len(list) == 0 {
		return telemetrytypes.FieldDataTypeString
	}
	allInt, allNumeric := true, true
	for _, v := range list {
		switch t := v.(type) {
		case float32, float64:
			allInt = false
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
			// integer Go types stay int-exact
		case string:
			if _, err := strconv.ParseInt(t, 10, 64); err != nil {
				allInt = false
			}
			if _, err := strconv.ParseFloat(t, 64); err != nil {
				allNumeric = false
			}
		default:
			// booleans (and anything else) -> String; a bool renders to 'true'/'false', so a
			// bool needle only matches genuine JSON booleans, not truthy numbers/strings.
			allInt, allNumeric = false, false
		}
	}
	switch {
	case allInt:
		return telemetrytypes.FieldDataTypeInt64
	case allNumeric:
		return telemetrytypes.FieldDataTypeFloat64
	default:
		return telemetrytypes.FieldDataTypeString
	}
}

// legacyCoerceNeedle coerces a needle to elem type dt so its bound-arg type matches the
// extracted column (legacyElemType guarantees it's coercible).
func legacyCoerceNeedle(v any, dt telemetrytypes.FieldDataType) any {
	switch dt {
	case telemetrytypes.FieldDataTypeInt64:
		if s, ok := v.(string); ok {
			if i, err := strconv.ParseInt(s, 10, 64); err == nil {
				return i
			}
		}
		return v
	case telemetrytypes.FieldDataTypeFloat64:
		if s, ok := v.(string); ok {
			f, _ := strconv.ParseFloat(s, 64)
			return f
		}
		return v
	default:
		return bodyArrayNeedleString(v)
	}
}

// getBodyJSONArrayKey extracts the leaf as Array(Nullable(<dt>)) — Nullable so a value of a
// different JSON type maps to NULL instead of corrupting (e.g. a non-numeric string → 0).
func getBodyJSONArrayKey(key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) string {
	name := key.Name
	if !strings.HasSuffix(name, "[*]") && !strings.HasSuffix(name, "[]") {
		name += "[*]"
	}
	arrKey := telemetrytypes.NewTelemetryFieldKey(name, key.FieldContext, key.FieldDataType)
	return fmt.Sprintf("JSONExtract(JSON_QUERY(body, '$.%s'), 'Array(Nullable(%s))')", getBodyJSONPath(arrKey), dt.CHDataType())
}

// getBodyJSONScalarKey builds the single-element-set fallback for a scalar body value: the leaf
// extracted as a scalar of type dt, plus a guard restricting it to a genuinely scalar body. The
// guard is required because JSON_VALUE returns ” for an array/object/missing value, which would
// otherwise zero-value match (has(x,0) / has(x,false) / has(x,”) on any array). ok=false when
// the path still traverses an array ([*]/[]).
func getBodyJSONScalarKey(key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (expr string, guard string, ok bool) {
	name := strings.TrimSuffix(strings.TrimSuffix(key.Name, "[*]"), "[]")
	if strings.Contains(name, "[") {
		return "", "", false
	}
	scalarKey := telemetrytypes.NewTelemetryFieldKey(name, key.FieldContext, key.FieldDataType)
	path := getBodyJSONPath(scalarKey)
	if dt == telemetrytypes.FieldDataTypeString {
		expr = fmt.Sprintf("JSON_VALUE(body, '$.%s')", path)
	} else {
		// Nullable so a scalar of a different type (e.g. a bool/string where a number is
		// searched) extracts to NULL rather than the type's default (0/false), which would
		// otherwise zero-value match has(x, 0).
		expr = fmt.Sprintf("JSONExtract(JSON_VALUE(body, '$.%s'), 'Nullable(%s)')", path, dt.CHDataType())
	}
	keys := strings.Split(name, ".")
	for i, k := range keys {
		keys[i] = "'" + k + "'"
	}
	guard = fmt.Sprintf("JSONType(body, %s) NOT IN ('Array', 'Object', 'Null')", strings.Join(keys, ", "))
	return expr, guard, true
}

func bodyArrayNeedleString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case bool:
		return strconv.FormatBool(t)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(t), 'f', -1, 64)
	default:
		return fmt.Sprintf("%v", t)
	}
}
