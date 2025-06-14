package querybuilder

import (
	"context"
	"fmt"
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
			// - the context is not provided
			// - there are not keys for the field
			// - it is not a static field
			// - the next best thing to do is see if there is a typo
			// and suggest a correction
			correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
			if found {
				// we found a close match, in the error message send the suggestion
				return "", nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
			} else {
				// not even a close match, return an error
				return "", nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field %s not found", field.Name)
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
		colName, _ = telemetrytypes.DataTypeCollisionHandledFieldName(field, dummyValue, colName)
		stmts = append(stmts, colName)
	}

	multiIfStmt := fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", "))

	return multiIfStmt, allArgs, nil
}
