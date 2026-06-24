package telemetrylogs

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"

	"golang.org/x/exp/maps"
)

var (
	logsV2Columns = map[string]*schema.Column{
		"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
		"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

		"timestamp":          {Name: "timestamp", Type: schema.ColumnTypeUInt64},
		"observed_timestamp": {Name: "observed_timestamp", Type: schema.ColumnTypeUInt64},
		"id":                 {Name: "id", Type: schema.ColumnTypeString},
		"trace_id":           {Name: "trace_id", Type: schema.ColumnTypeString},
		"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
		"trace_flags":        {Name: "trace_flags", Type: schema.ColumnTypeUInt32},
		"severity_text":      {Name: "severity_text", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"severity_number":    {Name: "severity_number", Type: schema.ColumnTypeUInt8},
		"body":               {Name: "body", Type: schema.ColumnTypeString},
		messageSubColumn:     {Name: messageSubColumn, Type: schema.ColumnTypeString},
		LogsV2BodyV2Column: {Name: LogsV2BodyV2Column, Type: schema.JSONColumnType{
			MaxDynamicTypes: utils.ToPointer(uint(32)),
			MaxDynamicPaths: utils.ToPointer(uint(0)),
		}},
		LogsV2BodyPromotedColumn: {Name: LogsV2BodyPromotedColumn, Type: schema.JSONColumnType{}},
		"attributes_string": {Name: "attributes_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"attributes_number": {Name: "attributes_number", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeFloat64,
		}},
		"attributes_bool": {Name: "attributes_bool", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeBool,
		}},
		"resources_string": {Name: "resources_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"resource":      {Name: "resource", Type: schema.JSONColumnType{}},
		"scope_name":    {Name: "scope_name", Type: schema.ColumnTypeString},
		"scope_version": {Name: "scope_version", Type: schema.ColumnTypeString},
		"scope_string": {Name: "scope_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

type fieldMapper struct {
	fl flagger.Flagger
}

func NewFieldMapper(fl flagger.Flagger) qbtypes.FieldMapper {
	return &fieldMapper{fl: fl}
}

func (m *fieldMapper) getColumn(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		columns := []*schema.Column{logsV2Columns["resources_string"], logsV2Columns["resource"]}
		return columns, nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return []*schema.Column{logsV2Columns["scope_name"]}, nil
		case "version", "scope.version", "scope_version":
			return []*schema.Column{logsV2Columns["scope_version"]}, nil
		}
		return []*schema.Column{logsV2Columns["scope_string"]}, nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return []*schema.Column{logsV2Columns["attributes_string"]}, nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return []*schema.Column{logsV2Columns["attributes_number"]}, nil
		case telemetrytypes.FieldDataTypeBool:
			return []*schema.Column{logsV2Columns["attributes_bool"]}, nil
		}
	case telemetrytypes.FieldContextBody:
		// Body context is for JSON body fields. Use body_v2 if feature flag is enabled.
		// TODO(Tushar): thread orgID here to evaluate correctly
		if m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
			if key.Name == messageSubField {
				return []*schema.Column{logsV2Columns[messageSubColumn]}, nil
			}
			return []*schema.Column{logsV2Columns[LogsV2BodyV2Column]}, nil
		}
		// Fall back to legacy body column
		return []*schema.Column{logsV2Columns["body"]}, nil
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		// TODO(Tushar): thread orgID here to evaluate correctly
		if key.Name == LogsV2BodyColumn && m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
			return []*schema.Column{logsV2Columns[messageSubColumn]}, nil
		}
		col, ok := logsV2Columns[key.Name]
		if !ok {
			// check if the key has body JSON search
			if strings.HasPrefix(key.Name, telemetrytypes.BodyJSONStringSearchPrefix) {
				// Use body_v2 if feature flag is enabled and we have a body condition builder
				// TODO(Tushar): thread orgID here to evaluate correctly
				if m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
					// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
					// i.e return both the body json and body json promoted and let the evolutions decide which one to use
					// based on the query range time.
					return []*schema.Column{logsV2Columns[LogsV2BodyV2Column]}, nil
				}
				// Fall back to legacy body column
				return []*schema.Column{logsV2Columns["body"]}, nil
			}
			return nil, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) FieldFor(ctx context.Context, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	var newColumns []*schema.Column
	var evolutionsEntries []*telemetrytypes.EvolutionEntry
	if len(key.Evolutions) > 0 {
		// we will use the corresponding column and its evolution entry for the query
		newColumns, evolutionsEntries, err = qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd)
		if err != nil {
			return "", err
		}
	} else {
		newColumns = columns
	}

	exprs := []string{}
	existExpr := []string{}
	for i, column := range newColumns {
		// Use evolution column name if available, otherwise use the column name
		columnName := column.Name
		if evolutionsEntries != nil && evolutionsEntries[i] != nil {
			columnName = evolutionsEntries[i].ColumnName
		}

		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			switch key.FieldContext {
			case telemetrytypes.FieldContextResource:
				exprs = append(exprs, fmt.Sprintf("%s.`%s`::String", columnName, key.Name))
				existExpr = append(existExpr, fmt.Sprintf("%s.`%s` IS NOT NULL", columnName, key.Name))
			case telemetrytypes.FieldContextBody:
				if key.Name == messageSubField {
					exprs = append(exprs, messageSubColumn)
					continue
				}

				if key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
					return "", qbtypes.ErrColumnNotFound
				}

				expr, err := m.buildFieldForJSON(key)
				if err != nil {
					return "", err
				}

				exprs = append(exprs, expr)
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "only resource/body context fields are supported for json columns, got %s", key.FieldContext.String)
			}

		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				exprs = append(exprs, column.Name)
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
			}
		case schema.ColumnTypeEnumString,
			schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
			exprs = append(exprs, column.Name)
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
				// a key could have been materialized, if so return the materialized column name
				if key.Materialized {
					exprs = append(exprs, telemetrytypes.FieldKeyToMaterializedColumnName(key))
					existExpr = append(existExpr, fmt.Sprintf("%s==true", telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)))
				} else {
					exprs = append(exprs, fmt.Sprintf("%s['%s']", columnName, key.Name))
					existExpr = append(existExpr, fmt.Sprintf("mapContains(%s, '%s')", columnName, key.Name))
				}
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
			}
		}
	}

	if len(exprs) == 1 {
		return exprs[0], nil
	} else if len(exprs) > 1 {
		// Ensure existExpr has the same length as exprs
		if len(existExpr) != len(exprs) {
			return "", errors.NewInternalf(errors.CodeInternal, "length of exist exprs doesn't match to that of exprs")
		}
		finalExprs := []string{}
		for i, expr := range exprs {
			finalExprs = append(finalExprs, fmt.Sprintf("%s, %s", existExpr[i], expr))
		}
		return "multiIf(" + strings.Join(finalExprs, ", ") + ", NULL)", nil
	}

	// should not reach here
	return columns[0].Name, nil
}

func (m *fieldMapper) ColumnFor(ctx context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	tsStart, tsEnd uint64,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	fieldExpression, err := m.FieldFor(ctx, tsStart, tsEnd, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		// we try to use the context we know of
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			// is it a static field?
			if _, ok := logsV2Columns[field.Name]; ok {
				// if it is, attach the column name directly
				field.FieldContext = telemetrytypes.FieldContextLog
				fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, field)
			} else {
				// - the context is not provided
				// - there are not keys for the field
				// - it is not a static field
				// - the next best thing to do is see if there is a typo
				// and suggest a correction
				wrappedErr := errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name).WithSuggestions(errors.SuggestionsOnLevenshteinDistance(field.Name, maps.Keys(keys))...)
				return "", wrappedErr
			}
		} else if len(keysForField) == 1 {
			// we have a single key for the field, use it
			fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, keysForField[0])
		} else {
			// select any non-empty value from the keys
			args := []string{}
			for _, key := range keysForField {
				fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, key)
				args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", fieldExpression, fieldExpression))
			}
			fieldExpression = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	} else if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(fieldExpression), field.Name), nil
}

// buildFieldForJSON builds the field expression for body JSON fields using arrayConcat pattern.
func (m *fieldMapper) buildFieldForJSON(key *telemetrytypes.TelemetryFieldKey) (string, error) {
	plan := key.JSONPlan
	if len(plan) == 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"Could not find any valid paths for: %s", key.Name)
	}

	if plan[0].IsTerminal {
		node := plan[0]

		expr := fmt.Sprintf("dynamicElement(%s, '%s')", node.FieldPath(), node.TerminalConfig.ElemType.StringValue())
		// TODO(Piyush): Promoted path logic commented out. Materialized now means type hint
		// promotion will be extracted from key field evolution
		// (direct sub-column access), not a promoted body_promoted.* column.
		// if key.Materialized {
		// 	if len(plan) < 2 {
		// 		return "", errors.Newf(errors.TypeUnexpected, CodePromotedPlanMissing,
		// 			"plan length is less than 2 for promoted path: %s", key.Name)
		// 	}

		// 	node := plan[1]
		// 	promotedExpr := fmt.Sprintf(
		// 		"dynamicElement(%s, '%s')",
		// 		node.FieldPath(),
		// 		node.TerminalConfig.ElemType.StringValue(),
		// 	)

		// 	// dynamicElement returns NULL for scalar types or an empty array for array types.
		// 	if node.TerminalConfig.ElemType.IsArray {
		// 		expr = fmt.Sprintf(
		// 			"if(length(%s) > 0, %s, %s)",
		// 			promotedExpr,
		// 			promotedExpr,
		// 			expr,
		// 		)
		// 	} else {
		// 		// promoted column first then body_json column
		// 		// TODO(Piyush): Change this in future for better performance
		// 		expr = fmt.Sprintf("coalesce(%s, %s)", promotedExpr, expr)
		// 	}

		// }

		return expr, nil
	}

	// Build arrayConcat pattern directly from the tree structure
	arrayConcatExpr, err := m.buildArrayConcat(plan)
	if err != nil {
		return "", err
	}

	return arrayConcatExpr, nil
}

// buildArrayConcat builds the arrayConcat pattern directly from the tree structure.
func (m *fieldMapper) buildArrayConcat(plan telemetrytypes.JSONAccessPlan) (string, error) {
	if len(plan) == 0 {
		return "", errors.NewInternalf(CodeGroupByPlanEmpty, "group by plan is empty while building arrayConcat")
	}

	// Build arrayMap expressions for ALL available branches at the root level.
	// Iterate branches in deterministic order (JSON then Dynamic)
	var arrayMapExpressions []string
	for _, node := range plan {
		for _, branchType := range node.BranchesInOrder() {
			expr, err := m.buildArrayMap(node, branchType)
			if err != nil {
				return "", err
			}
			arrayMapExpressions = append(arrayMapExpressions, expr)
		}
	}
	if len(arrayMapExpressions) == 0 {
		return "", errors.NewInternalf(CodeArrayMapExpressionsEmpty, "array map expressions are empty while building arrayConcat")
	}

	// Build the arrayConcat expression
	arrayConcatExpr := fmt.Sprintf("arrayConcat(%s)", strings.Join(arrayMapExpressions, ", "))

	// Wrap with arrayFlatten
	arrayFlattenExpr := fmt.Sprintf("arrayFlatten(%s)", arrayConcatExpr)

	return arrayFlattenExpr, nil
}

// buildArrayMap builds the arrayMap expression for a specific branch, handling all sub-branches.
func (m *fieldMapper) buildArrayMap(currentNode *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType) (string, error) {
	if currentNode == nil {
		return "", errors.NewInternalf(CodeCurrentNodeNil, "current node is nil while building arrayMap")
	}

	childNode := currentNode.Branches[branchType]
	if childNode == nil {
		return "", errors.NewInternalf(CodeChildNodeNil, "child node is nil while building arrayMap")
	}

	// Build the array expression for this level
	var arrayExpr string
	if branchType == telemetrytypes.BranchJSON {
		// Array(JSON) branch
		arrayExpr = fmt.Sprintf("dynamicElement(%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')",
			currentNode.FieldPath(), currentNode.MaxDynamicTypes, currentNode.MaxDynamicPaths)
	} else {
		// Array(Dynamic) branch - filter for JSON objects
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", currentNode.FieldPath())
		arrayExpr = fmt.Sprintf("arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)
	}

	// If this is the terminal level, return the simple arrayMap
	if childNode.IsTerminal {
		dynamicElementExpr := fmt.Sprintf("dynamicElement(%s, '%s')", childNode.FieldPath(),
			childNode.TerminalConfig.ElemType.StringValue(),
		)
		return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), dynamicElementExpr, arrayExpr), nil
	}

	// For non-terminal nodes, we need to handle ALL possible branches at the next level.
	// Use deterministic branch order so generated SQL is stable across environments.
	var nestedExpressions []string
	for _, branchType := range childNode.BranchesInOrder() {
		expr, err := m.buildArrayMap(childNode, branchType)
		if err != nil {
			return "", err
		}
		nestedExpressions = append(nestedExpressions, expr)
	}

	// If we have multiple nested expressions, we need to concat them
	var nestedExpr string
	if len(nestedExpressions) == 1 {
		nestedExpr = nestedExpressions[0]
	} else if len(nestedExpressions) > 1 {
		nestedExpr = fmt.Sprintf("arrayConcat(%s)", strings.Join(nestedExpressions, ", "))
	} else {
		return "", errors.NewInternalf(CodeNestedExpressionsEmpty, "nested expressions are empty while building arrayMap")
	}

	return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), nestedExpr, arrayExpr), nil
}
