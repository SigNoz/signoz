package telemetrylogs

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

// logicalFieldMetadata defines how a conceptual/logical field (like "body")
// is projected and how specific operators are translated into conditions.
//
// This allows us to treat fields that are backed by multiple physical columns
// (e.g. body, body_json, body_json_promoted) in a single, centralized place
// without scattering ad-hoc condition logic across builders.
type logicalFieldMetadata struct {
	FieldExpressions []string

	// Conditions optionally overrides how specific operators are translated
	// into SQL conditions for this logical field. If an operator is not present
	// here, we fall back to the standard condition-building flow.
	Conditions qbtypes.OperatorToConditionRegistry
}

// buildBodyLogicalFieldMetadata creates the metadata for the "body" logical field.
// This function is used to avoid circular dependencies when condition functions
// need to access FieldExpressions.
func buildBodyLogicalFieldMetadata() logicalFieldMetadata {
	// Capture field expressions in a local variable to avoid accessing the registry
	// from within condition functions (which would create a circular dependency)
	fieldExpressions := []string{
		LogsV2BodyColumn,
	}
	if querybuilder.BodyJSONQueryEnabled {
		fieldExpressions = append(fieldExpressions, jsonMergeExpr())
	}

	return logicalFieldMetadata{
		FieldExpressions: fieldExpressions,
		Conditions: qbtypes.OperatorToConditionRegistry{
			// body Exists / body != ""
			qbtypes.FilterOperatorExists: func(sb *sqlbuilder.SelectBuilder, _ any) (string, error) {
				conditions := []string{
					sb.Equal(emptyFunctionWrapped(LogsV2BodyColumn), false),
				}
				if !querybuilder.BodyJSONQueryEnabled {
					return conditions[0], nil
				}
				conditions = append(conditions, sb.Equal(emptyFunctionWrapped(LogsV2BodyJSONColumn), false))
				conditions = append(conditions, sb.Equal(emptyFunctionWrapped(LogsV2BodyPromotedColumn), false))
				// Any of the representations being non-empty counts as "exists".
				return sb.Or(conditions...), nil
			},
			// body Not Exists / body == ""
			qbtypes.FilterOperatorNotExists: func(sb *sqlbuilder.SelectBuilder, _ any) (string, error) {
				conditions := []string{
					sb.Equal(emptyFunctionWrapped(LogsV2BodyColumn), true),
				}
				if !querybuilder.BodyJSONQueryEnabled {
					return conditions[0], nil
				}
				conditions = append(conditions, sb.Equal(emptyFunctionWrapped(LogsV2BodyJSONColumn), true))
				conditions = append(conditions, sb.Equal(emptyFunctionWrapped(LogsV2BodyPromotedColumn), true))
				// All representations must be empty for "not exists".
				return sb.And(conditions...), nil
			},
			qbtypes.FilterOperatorRegexp: func(sb *sqlbuilder.SelectBuilder, value any) (string, error) {
				conditions := []string{}
				for _, expression := range fieldExpressions {
					conditions = append(conditions, fmt.Sprintf(`match(LOWER(%s), LOWER(%s))`, expression, sb.Var(value)))
				}
				return sb.Or(conditions...), nil
			},
			qbtypes.FilterOperatorNotRegexp: func(sb *sqlbuilder.SelectBuilder, value any) (string, error) {
				conditions := []string{}
				for _, expression := range fieldExpressions {
					conditions = append(conditions, fmt.Sprintf(`NOT match(LOWER(%s), LOWER(%s))`, expression, sb.Var(value)))
				}
				return sb.Or(conditions...), nil
			},
		},
	}
}

var logicalFieldRegistry = map[string]logicalFieldMetadata{
	"body": buildBodyLogicalFieldMetadata(),
}
