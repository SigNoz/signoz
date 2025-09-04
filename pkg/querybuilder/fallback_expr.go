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
		condition, err := cb.ConditionFor(ctx, key, qbtypes.FilterOperatorExists, nil, sb)
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
				colName, _ = telemetrytypes.DataTypeCollisionHandledFieldName(key, dummyValue, colName)
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
			colName, _ = telemetrytypes.DataTypeCollisionHandledFieldName(field, dummyValue, colName)
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
