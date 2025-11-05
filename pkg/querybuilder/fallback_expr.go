package querybuilder

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"
)

func CollisionHandledFinalExpr(
	ctx context.Context,
	field *telemetrytypes.TelemetryFieldKey,
	fm qbtypes.FieldMapper,
	cb qbtypes.ConditionBuilder,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	requiredDataType telemetrytypes.FieldDataType,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) (string, []any, error) {

	if requiredDataType != telemetrytypes.FieldDataTypeString &&
		requiredDataType != telemetrytypes.FieldDataTypeFloat64 {
		return "", nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unsupported data type %s", requiredDataType)
	}

	var dummyValue any
	if requiredDataType == telemetrytypes.FieldDataTypeFloat64 {
		dummyValue = 0.0
	} else {
		dummyValue = ""
	}

	var stmts []string
	var allArgs []any

	addCondition := func(key *telemetrytypes.TelemetryFieldKey) error {
		sb := sqlbuilder.NewSelectBuilder()
        condition, err := cb.ConditionFor(ctx, key, qbtypes.FilterOperatorExists, nil, sb, 0, 0)
		if err != nil {
			return err
		}
		sb.Where(condition)

		expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		expr = strings.TrimPrefix(expr, "WHERE ")
		stmts = append(stmts, expr)
		allArgs = append(allArgs, args...)
		return nil
	}

	colName, err := fm.FieldFor(ctx, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		// we try to use the context we know of
		keysForField := keys[field.Name]

		if len(keysForField) == 0 {
			// check if the key exists with {fieldContext}.{key}
			// because the context could be legitimate prefix in user data, example `metric.max`
			keyWithContext := fmt.Sprintf("%s.%s", field.FieldContext.StringValue(), field.Name)
			if len(keys[keyWithContext]) > 0 {
				keysForField = keys[keyWithContext]
			}
		}

		if len(keysForField) == 0 {
			// - the context is not provided
			// - there are not keys for the field
			// - it is not a static field
			// - the next best thing to do is see if there is a typo
			// and suggest a correction
			correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
			if found {
				// we found a close match, in the error message send the suggestion
				return "", nil, errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
			} else {
				// not even a close match, return an error
				return "", nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
			}
		} else {
			for _, key := range keysForField {
				err := addCondition(key)
				if err != nil {
					return "", nil, err
				}
				colName, _ = fm.FieldFor(ctx, key)
				colName, _ = DataTypeCollisionHandledFieldName(key, dummyValue, colName, qbtypes.FilterOperatorUnknown)
				stmts = append(stmts, colName)
			}
		}
	} else {
		err := addCondition(field)
		if err != nil {
			return "", nil, err
		}

		if strings.HasPrefix(field.Name, jsonBodyPrefix) && jsonBodyPrefix != "" && jsonKeyToKey != nil {
			// TODO(nitya): enable group by on body column?
			return "", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "Group by/Aggregation isn't available for the body column")
			// colName, _ = jsonKeyToKey(context.Background(), field, qbtypes.FilterOperatorUnknown, dummyValue)
		} else {
			colName, _ = DataTypeCollisionHandledFieldName(field, dummyValue, colName, qbtypes.FilterOperatorUnknown)
		}

		stmts = append(stmts, colName)
	}

	for idx := range stmts {
		stmts[idx] = sqlbuilder.Escape(stmts[idx])
	}

	multiIfStmt := fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", "))

	return multiIfStmt, allArgs, nil
}

func GroupByKeys(keys []qbtypes.GroupByKey) []string {
	k := []string{}
	for _, key := range keys {
		k = append(k, "`"+key.Name+"`")
	}
	return k
}

func FormatValueForContains(value any) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)

	case json.Number:
		return v.String()

	case float64:
		if v == math.Trunc(v) && v >= -1e15 && v <= 1e15 {
			return fmt.Sprintf("%.0f", v)
		}
		return strconv.FormatFloat(v, 'f', -1, 64)

	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32)

	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v)

	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)

	case bool:
		return strconv.FormatBool(v)

	case fmt.Stringer:
		return v.String()

	default:
		// fallback - try to convert through reflection
		rv := reflect.ValueOf(value)
		switch rv.Kind() {
		case reflect.Float32, reflect.Float64:
			f := rv.Float()
			if f == math.Trunc(f) && f >= -1e15 && f <= 1e15 {
				return fmt.Sprintf("%.0f", f)
			}
			return strconv.FormatFloat(f, 'f', -1, 64)
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			return strconv.FormatInt(rv.Int(), 10)
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			return strconv.FormatUint(rv.Uint(), 10)
		default:
			return fmt.Sprintf("%v", value)
		}
	}
}

func FormatFullTextSearch(input string) string {
	if _, err := regexp.Compile(input); err != nil {
		// Not a valid regex -> treat as literal substring
		return regexp.QuoteMeta(input)
	}
	return input
}

func DataTypeCollisionHandledFieldName(key *telemetrytypes.TelemetryFieldKey, value any, tblFieldName string, operator qbtypes.FilterOperator) (string, any) {
	// This block of code exists to handle the data type collisions
	// We don't want to fail the requests when there is a key with more than one data type
	// Let's take an example of `http.status_code`, and consider user sent a string value and number value
	// When they search for `http.status_code=200`, we will search across both the number columns and string columns
	// and return the results from both the columns
	// While we expect user not to send the mixed data types, it inevitably happens
	// So we handle the data type collisions here
	switch key.FieldDataType {
	case telemetrytypes.FieldDataTypeString:
		switch v := value.(type) {
		case float64:
			// try to convert the string value to to number
			tblFieldName = castFloat(tblFieldName)
		case []any:
			if allFloats(v) {
				tblFieldName = castFloat(tblFieldName)
			} else if hasString(v) {
				_, value = castString(tblFieldName), toStrings(v)
			}
		case bool:
			// we don't have a toBoolOrNull in ClickHouse, so we need to convert the bool to a string
			value = fmt.Sprintf("%t", v)
		}

	case telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeNumber:
		switch v := value.(type) {
		// why? ; CH returns an error for a simple check
		// attributes_number['http.status_code'] = 200 but not for attributes_number['http.status_code'] >= 200
		// DB::Exception: Bad get: has UInt64, requested Float64.
		// How is it working in v4? v4 prepares the full query with values in query string
		// When we format the float it becomes attributes_number['http.status_code'] = 200.000
		// Which CH gladly accepts and doesn't throw error
		// However, when passed as query args, the default formatter
		// https://github.com/ClickHouse/clickhouse-go/blob/757e102f6d8c6059d564ce98795b4ce2a101b1a5/bind.go#L393
		// is used which prepares the
		// final query as attributes_number['http.status_code'] = 200 giving this error
		// This following is one way to workaround it

		// if the key is a number, the value is a string, we will let clickHouse handle the conversion
		case float32, float64:
			tblFieldName = castFloatHack(tblFieldName)
		case string:
			// check if it's a number inside a string
			isNumber := false
			if _, err := strconv.ParseFloat(v, 64); err == nil {
				isNumber = true
			}

			if !operator.IsComparisonOperator() || !isNumber {
				// try to convert the number attribute to string
				tblFieldName = castString(tblFieldName) // numeric col vs string literal
			} else {
				tblFieldName = castFloatHack(tblFieldName)
			}
		case []any:
			if allFloats(v) {
				tblFieldName = castFloatHack(tblFieldName)
			} else if hasString(v) {
				tblFieldName, value = castString(tblFieldName), toStrings(v)
			}
		}

	case telemetrytypes.FieldDataTypeBool:
		switch v := value.(type) {
		case string:
			tblFieldName = castString(tblFieldName)
		case []any:
			if hasString(v) {
				tblFieldName, value = castString(tblFieldName), toStrings(v)
			}
		}
	}
	return tblFieldName, value
}

func castFloat(col string) string     { return fmt.Sprintf("toFloat64OrNull(%s)", col) }
func castFloatHack(col string) string { return fmt.Sprintf("toFloat64(%s)", col) }
func castString(col string) string    { return fmt.Sprintf("toString(%s)", col) }

func allFloats(in []any) bool {
	for _, x := range in {
		if _, ok := x.(float64); !ok {
			return false
		}
	}
	return true
}

func hasString(in []any) bool {
	for _, x := range in {
		if _, ok := x.(string); ok {
			return true
		}
	}
	return false
}

func toStrings(in []any) []any {
	out := make([]any, len(in))
	for i, x := range in {
		out[i] = fmt.Sprintf("%v", x)
	}
	return out
}
