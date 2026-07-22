package telemetrylogs

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
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

func (m *fieldMapper) getColumn(ctx context.Context, orgID valuer.UUID, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		columns := []*schema.Column{logsV2Columns["resource"], logsV2Columns["resources_string"]}
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
		if m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
			if key.Name == messageSubField {
				return []*schema.Column{logsV2Columns[messageSubColumn]}, nil
			}
			return []*schema.Column{logsV2Columns[LogsV2BodyV2Column]}, nil
		}
		// Fall back to legacy body column
		return []*schema.Column{logsV2Columns["body"]}, nil
	case telemetrytypes.FieldContextLog:
		if key.Name == LogsV2BodyColumn && m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
			return []*schema.Column{logsV2Columns[messageSubColumn]}, nil
		}
		col, ok := logsV2Columns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) FieldFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, orgID, key)
	if err != nil {
		return "", err
	}

	newColumns, evolutionsEntries, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd)
	if err != nil {
		return "", err
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
					existExpr = append(existExpr, telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key))
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

func (m *fieldMapper) ColumnFor(ctx context.Context, orgID valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, orgID, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	field *telemetrytypes.TelemetryFieldKey,
	requiredDataType telemetrytypes.FieldDataType,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	bodyJSONEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	var candidates []*telemetrytypes.TelemetryFieldKey
	switch _, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, field); {
	case err == nil:
		if field.FieldContext == telemetrytypes.FieldContextBody && !bodyJSONEnabled {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "Operation isn't available for the body column")
		}
		candidates = []*telemetrytypes.TelemetryFieldKey{field}
	case errors.Is(err, qbtypes.ErrColumnNotFound):
		if _, ok := logsV2Columns[field.Name]; ok {
			field.FieldContext = telemetrytypes.FieldContextLog
			candidates = []*telemetrytypes.TelemetryFieldKey{field}
			break
		}
		candidates = keys[field.Name]
		if len(candidates) == 0 {
			candidates = keys[fmt.Sprintf("%s.%s", field.FieldContext.StringValue(), field.Name)]
		}
		if len(candidates) == 0 {
			// synthesized attribute candidates first, body path last; legacy body
			// doesn't support group by/select, so bare keys keep attributes only
			for _, key := range m.CandidateKeys(ctx, orgID, field, nil, nil) {
				if !bodyJSONEnabled && field.FieldContext == telemetrytypes.FieldContextUnspecified &&
					key.FieldContext == telemetrytypes.FieldContextBody {
					continue
				}
				candidates = append(candidates, key)
			}
		}
		if len(candidates) == 0 {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "field `%s` not found", field.Name)
		}
	default:
		return "", err
	}

	// Group-by/order (String) and aggregation (String/Float64): every candidate is
	// exists-guarded and coerced to requiredDataType, in a single multiIf. Raw select
	// (Unspecified) keeps the lighter native shape below.
	if requiredDataType != telemetrytypes.FieldDataTypeUnspecified {
		// arrays cannot sit inside Nullable/multiIf, so a lone array candidate stays bare
		if len(candidates) == 1 && (strings.Contains(candidates[0].Name, telemetrytypes.ArraySep) ||
			strings.Contains(candidates[0].Name, telemetrytypes.ArrayAnyIndex) ||
			candidates[0].FieldDataType.IsArray()) {
			return m.FieldFor(ctx, orgID, tsStart, tsEnd, candidates[0])
		}
		var dummyValue any = ""
		if requiredDataType == telemetrytypes.FieldDataTypeFloat64 {
			dummyValue = 0.0
		}
		var stmts []string
		for _, key := range candidates {
			guard, err := m.existsExpressionFor(ctx, orgID, tsStart, tsEnd, key, true)
			if err != nil {
				return "", err
			}
			var fieldExpression string
			if key.FieldContext == telemetrytypes.FieldContextBody && !bodyJSONEnabled {
				fieldExpression, _ = GetBodyJSONKey(ctx, key, qbtypes.FilterOperatorUnknown, dummyValue)
			} else {
				fieldExpression, err = m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
				if err != nil {
					return "", err
				}
				fieldExpression, _ = querybuilder.DataTypeCollisionHandledFieldName(key, dummyValue, fieldExpression, qbtypes.FilterOperatorUnknown)
			}
			stmts = append(stmts, guard, fieldExpression)
		}
		return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", ")), nil
	}

	if len(candidates) == 1 {
		// arrays cannot sit inside Nullable, so array candidates stay bare
		if strings.Contains(candidates[0].Name, telemetrytypes.ArraySep) ||
			strings.Contains(candidates[0].Name, telemetrytypes.ArrayAnyIndex) ||
			candidates[0].FieldDataType.IsArray() {
			return m.FieldFor(ctx, orgID, tsStart, tsEnd, candidates[0])
		}
		if !m.membershipGuarded(ctx, orgID, tsStart, tsEnd, candidates[0]) {
			return m.FieldFor(ctx, orgID, tsStart, tsEnd, candidates[0])
		}
		guard, err := m.existsExpressionFor(ctx, orgID, tsStart, tsEnd, candidates[0], true)
		if err != nil {
			return "", err
		}
		var fieldExpression string
		if candidates[0].FieldContext == telemetrytypes.FieldContextBody && !bodyJSONEnabled {
			fieldExpression, _ = GetBodyJSONKey(ctx, candidates[0], qbtypes.FilterOperatorUnknown, "")
		} else {
			fieldExpression, err = m.FieldFor(ctx, orgID, tsStart, tsEnd, candidates[0])
			if err != nil {
				return "", err
			}
		}
		return fmt.Sprintf("multiIf(%s, %s, NULL)", guard, fieldExpression), nil
	}

	var stmts []string
	for _, key := range candidates {
		guard, err := m.existsExpressionFor(ctx, orgID, tsStart, tsEnd, key, true)
		if err != nil {
			return "", err
		}
		stmts = append(stmts, guard)

		var fieldExpression string
		if key.FieldContext == telemetrytypes.FieldContextBody && !bodyJSONEnabled {
			fieldExpression, _ = GetBodyJSONKey(ctx, key, qbtypes.FilterOperatorUnknown, "")
		} else {
			fieldExpression, err = m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
			if err != nil {
				return "", err
			}
			fieldExpression, _ = querybuilder.DataTypeCollisionHandledFieldName(key, "", fieldExpression, qbtypes.FilterOperatorUnknown)
		}
		stmts = append(stmts, fieldExpression)
	}

	return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", ")), nil
}

func (m *fieldMapper) CandidateKeys(_ context.Context, _ valuer.UUID, field *telemetrytypes.TelemetryFieldKey, value any, keys map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	if matches := keys[field.Name]; len(matches) > 0 {
		return matches
	}
	if matches := keys[fmt.Sprintf("%s.%s", field.FieldContext.StringValue(), field.Name)]; len(matches) > 0 {
		return matches
	}

	switch field.FieldContext {
	case telemetrytypes.FieldContextBody:
		if field.Name == "" {
			return nil
		}
		return []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(field.Name, field.FieldContext, field.FieldDataType)}
	case telemetrytypes.FieldContextUnspecified:
		// a real column wins before synthesis (so adjustKeys is not needed to resolve these)
		if _, ok := logsV2Columns[field.Name]; ok {
			return []*telemetrytypes.TelemetryFieldKey{{Name: field.Name, FieldContext: telemetrytypes.FieldContextLog}}
		}
		bodyKey := telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextBody, field.FieldDataType)
		if value == nil && bodyKey.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
			bodyKey.FieldDataType = telemetrytypes.FieldDataTypeString
		}
		return append(querybuilder.SynthesizeKeys(field, value), bodyKey)
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource:
		// stripped interpretation first, the literal `{context}.{name}` spelling second
		literal := telemetrytypes.NewTelemetryFieldKey(field.FieldContext.StringValue()+"."+field.Name, field.FieldContext, field.FieldDataType)
		return append(querybuilder.SynthesizeKeys(field, value), querybuilder.SynthesizeKeys(literal, value)...)
	case telemetrytypes.FieldContextLog:
		if _, ok := logsV2Columns[field.Name]; ok {
			return []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(field.Name, field.FieldContext, field.FieldDataType)}
		}
		stripped := telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextUnspecified, field.FieldDataType)
		literal := telemetrytypes.NewTelemetryFieldKey(field.FieldContext.StringValue()+"."+field.Name, telemetrytypes.FieldContextUnspecified, field.FieldDataType)
		// attribute candidates first (stripped, then literal), body paths last
		candidates := append(querybuilder.SynthesizeKeys(stripped, value), querybuilder.SynthesizeKeys(literal, value)...)
		for _, key := range []*telemetrytypes.TelemetryFieldKey{stripped, literal} {
			bodyKey := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextBody, key.FieldDataType)
			if value == nil && bodyKey.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
				bodyKey.FieldDataType = telemetrytypes.FieldDataTypeString
			}
			candidates = append(candidates, bodyKey)
		}
		return candidates
	}
	return nil
}

// buildFieldForJSON builds the field expression for body JSON fields using arrayConcat pattern.
func (m *fieldMapper) buildFieldForJSON(key *telemetrytypes.TelemetryFieldKey) (string, error) {
	plan := key.JSONPlan
	if len(plan) == 0 {
		if key.KeyNameContainsArray() {
			keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
			if err := keyCopy.SetExhaustiveJSONAccessPlan(
				telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, key.FieldDataType,
			); err != nil {
				return "", err
			}
			return m.buildArrayConcat(keyCopy.JSONPlan)
		}

		elemType := key.GetJSONDataType()
		if elemType.StringValue() == "" {
			elemType = telemetrytypes.String
		}

		fieldPath := fmt.Sprintf("%s.`%s`", LogsV2BodyV2Column, key.Name)
		return fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, elemType.StringValue()), nil
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

func (m *fieldMapper) membershipGuarded(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) bool {
	if key.FieldContext == telemetrytypes.FieldContextBody {
		return true
	}
	columns, err := m.getColumn(ctx, orgID, key)
	if err != nil {
		return false
	}
	newColumns, _, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd)
	if err != nil || len(newColumns) != 1 {
		return false
	}
	columnType := newColumns[0].Type.GetType()
	return columnType == schema.ColumnTypeEnumMap || columnType == schema.ColumnTypeEnumJSON
}

func (m *fieldMapper) existsExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
	exists bool,
) (string, error) {
	columns, err := m.getColumn(ctx, orgID, key)
	if errors.Is(err, qbtypes.ErrColumnNotFound) && key.FieldContext == telemetrytypes.FieldContextUnspecified {
		bodyKey := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextBody, key.FieldDataType)
		columns, err = m.getColumn(ctx, orgID, bodyKey)
	}
	if err != nil {
		return "", err
	}

	operator := qbtypes.FilterOperatorExists
	if !exists {
		operator = qbtypes.FilterOperatorNotExists
	}

	bodyJSONEnabled := m.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && bodyJSONEnabled && key.Name != messageSubField {
			valueType, value := InferDataType(nil, operator, key)
			if len(key.JSONPlan) == 0 {
				keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
				if err := keyCopy.SetExhaustiveJSONAccessPlan(
					telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, valueType,
				); err != nil {
					return "", err
				}
				key = keyCopy
			}
			sb := sqlbuilder.NewSelectBuilder()
			cond, err := NewJSONConditionBuilder(key, valueType).buildJSONCondition(operator, value, sb)
			if err != nil {
				return "", err
			}
			sb.Where(cond)
			expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			expr = strings.TrimPrefix(expr, "WHERE ")
			if len(args) > 0 {
				expr, err = sqlbuilder.ClickHouse.Interpolate(expr, args)
				if err != nil {
					return "", err
				}
			}
			return expr, nil
		}
	}

	if isBodyJSONSearch(key, columns) && !bodyJSONEnabled {
		if exists {
			return GetBodyJSONKeyForExists(ctx, key, operator, nil), nil
		}
		return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, nil), nil
	}

	fieldExpression, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	return querybuilder.ExistsExpression(columns, key, tsStart, tsEnd, fieldExpression, exists)
}
