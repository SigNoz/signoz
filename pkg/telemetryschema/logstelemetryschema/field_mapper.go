package logstelemetryschema

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
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
		if q.BodyJSONOn {
			if key.Name == messageSubField {
				return []*schema.Column{logsV2Columns[messageSubColumn]}, nil
			}
			return []*schema.Column{logsV2Columns[LogsV2BodyV2Column]}, nil
		}
		// Fall back to legacy body column
		return []*schema.Column{logsV2Columns["body"]}, nil
	case telemetrytypes.FieldContextLog:
		if key.Name == LogsV2BodyColumn && q.BodyJSONOn {
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

func (m *storage) Read(_ context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(q, key)
	if err != nil {
		return "", err
	}

	newColumns, evolutionsEntries, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, q.StartNs, q.EndNs)
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

// buildFieldForJSON builds the field expression for body JSON fields using arrayConcat pattern.
func (m *storage) buildFieldForJSON(key *telemetrytypes.TelemetryFieldKey) (string, error) {
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
func (m *storage) buildArrayConcat(plan telemetrytypes.JSONAccessPlan) (string, error) {
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
func (m *storage) buildArrayMap(currentNode *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType) (string, error) {
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

// searchColumns is the single source of truth for the columns search() fans out across,
// by context; body is body_v2 when useJSONBody, else the legacy body string.
func searchColumns(fieldContext telemetrytypes.FieldContext, useJSONBody bool) []*schema.Column {
	switch fieldContext {
	case telemetrytypes.FieldContextLog:
		return []*schema.Column{
			logsV2Columns[LogsV2SeverityTextColumn],
			logsV2Columns[LogsV2TraceIDColumn],
			logsV2Columns[LogsV2SpanIDColumn],
		}
	case telemetrytypes.FieldContextBody:
		if useJSONBody {
			return []*schema.Column{logsV2Columns[LogsV2BodyV2Column]}
		}
		return []*schema.Column{logsV2Columns[LogsV2BodyColumn]}
	case telemetrytypes.FieldContextAttribute:
		return []*schema.Column{
			logsV2Columns[LogsV2AttributesStringColumn],
			logsV2Columns[LogsV2AttributesNumberColumn],
			logsV2Columns[LogsV2AttributesBoolColumn],
		}
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{
			logsV2Columns[LogsV2ResourcesStringColumn],
		}
	default:
		columns := searchColumns(telemetrytypes.FieldContextLog, useJSONBody)
		columns = append(columns, searchColumns(telemetrytypes.FieldContextBody, useJSONBody)...)
		columns = append(columns, searchColumns(telemetrytypes.FieldContextAttribute, useJSONBody)...)
		columns = append(columns, searchColumns(telemetrytypes.FieldContextResource, useJSONBody)...)
		return columns
	}
}

func (m *storage) Exists(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	columns, err := m.getColumn(q, key)
	if errors.Is(err, qbtypes.ErrColumnNotFound) && key.FieldContext == telemetrytypes.FieldContextUnspecified {
		bodyKey := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextBody, key.FieldDataType)
		columns, err = m.getColumn(q, bodyKey)
	}
	if err != nil {
		return qbtypes.Existence{}, err
	}

	operator := qbtypes.FilterOperatorExists
	if !exists {
		operator = qbtypes.FilterOperatorNotExists
	}

	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && q.BodyJSONOn && key.Name != messageSubField {
			valueType, value := InferDataType(nil, operator, key)
			if len(key.JSONPlan) == 0 {
				keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
				if err := keyCopy.SetExhaustiveJSONAccessPlan(
					telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, valueType,
				); err != nil {
					return qbtypes.Existence{}, err
				}
				key = keyCopy
			}
			sb := sqlbuilder.NewSelectBuilder()
			cond, err := NewJSONConditionBuilder(key, valueType).buildJSONCondition(operator, value, sb)
			if err != nil {
				return qbtypes.Existence{}, err
			}
			sb.Where(cond)
			expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			expr = strings.TrimPrefix(expr, "WHERE ")
			if len(args) > 0 {
				expr, err = sqlbuilder.ClickHouse.Interpolate(expr, args)
				if err != nil {
					return qbtypes.Existence{}, err
				}
			}
			// a JSON path reads NULL when the row lacks it
			return qbtypes.Existence{Predicate: expr, WhenAbsent: qbtypes.AbsentIsNull}, nil
		}
	}

	if isBodyJSONSearch(key, columns) && !q.BodyJSONOn {
		predicate := GetBodyJSONKeyForExists(ctx, key, operator, nil)
		if !exists {
			predicate = "NOT " + predicate
		}
		return qbtypes.Existence{Predicate: predicate, WhenAbsent: qbtypes.AbsentIsSentinel}, nil
	}

	fieldExpression, err := m.Read(ctx, q, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	predicate, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, fieldExpression, exists)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	return qbtypes.Existence{Predicate: predicate, WhenAbsent: absentReads(q, key, columns)}, nil
}

// absentReads tells what a row without the key reads: NULL from a multi-era
// read, the empty value from a map or from a JSON path (its ::String cast
// folds NULL to the empty string), and a real value from every other column.
func absentReads(q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, columns []*schema.Column) qbtypes.Absent {
	newColumns, _, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, q.StartNs, q.EndNs)
	if err != nil || len(newColumns) != 1 {
		return qbtypes.AbsentIsNull
	}
	switch newColumns[0].Type.GetType() {
	case schema.ColumnTypeEnumMap, schema.ColumnTypeEnumJSON:
		return qbtypes.AbsentIsSentinel
	}
	return qbtypes.AlwaysPresent
}

// Fallback answers a key metadata does not report: a column name is the
// column, a body path is itself, and any other name synthesizes its type
// variants under the stripped and the literal spelling, with the body path
// last. A body function narrows the answer to body paths.
func (m *storage) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any) ([]*telemetrytypes.LogicalField, error) {
	if key.FieldContext == telemetrytypes.FieldContextBody && key.Name == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
	}
	var keys []*telemetrytypes.TelemetryFieldKey
	switch key.FieldContext {
	case telemetrytypes.FieldContextBody:
		keys = []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)}
	case telemetrytypes.FieldContextUnspecified:
		if _, ok := logsV2Columns[key.Name]; ok {
			keys = []*telemetrytypes.TelemetryFieldKey{{Name: key.Name, FieldContext: telemetrytypes.FieldContextLog}}
			break
		}
		keys = append(querybuilder.SynthesizeKeys(key, value), bodyPath(key.Name, key.FieldDataType, value))
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource:
		// a context can be a legitimate prefix in user data
		literal := telemetrytypes.NewTelemetryFieldKey(key.FieldContext.StringValue()+"."+key.Name, key.FieldContext, key.FieldDataType)
		keys = append(querybuilder.SynthesizeKeys(key, value), querybuilder.SynthesizeKeys(literal, value)...)
	case telemetrytypes.FieldContextLog:
		if _, ok := logsV2Columns[key.Name]; ok {
			keys = []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)}
			break
		}
		stripped := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextUnspecified, key.FieldDataType)
		literal := telemetrytypes.NewTelemetryFieldKey(key.FieldContext.StringValue()+"."+key.Name, telemetrytypes.FieldContextUnspecified, key.FieldDataType)
		keys = append(querybuilder.SynthesizeKeys(stripped, value), querybuilder.SynthesizeKeys(literal, value)...)
		for _, spelling := range []*telemetrytypes.TelemetryFieldKey{stripped, literal} {
			keys = append(keys, bodyPath(spelling.Name, spelling.FieldDataType, value))
		}
	}
	if operator.IsFunctionOperator() {
		if key.FieldContext != telemetrytypes.FieldContextBody {
			return nil, querybuilder.NewFunctionUnsupportedError(operator)
		}
		bodyKeys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys))
		for _, k := range keys {
			if k.FieldContext == telemetrytypes.FieldContextBody {
				bodyKeys = append(bodyKeys, k)
			}
		}
		keys = bodyKeys
	}
	return querybuilder.WrapAsLogicalFields(key.Name, keys), nil
}

// bodyPath is the body JSON path for a name; without an operand to type it,
// a string path.
func bodyPath(name string, dataType telemetrytypes.FieldDataType, value any) *telemetrytypes.TelemetryFieldKey {
	bodyKey := telemetrytypes.NewTelemetryFieldKey(name, telemetrytypes.FieldContextBody, dataType)
	if value == nil && bodyKey.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
		bodyKey.FieldDataType = telemetrytypes.FieldDataTypeString
	}
	return bodyKey
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{
		Split:                 qbtypes.MainOfSplit,
		SupportsBodyFunctions: true,
		OwnContexts:           []telemetrytypes.FieldContext{telemetrytypes.FieldContextLog},
	}
}

// ColumnRead answers the legacy body column as not selectable: without the
// JSON body, a body path has no column read.
func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	if logical.FieldContext == telemetrytypes.FieldContextBody && !q.BodyJSONOn {
		return qbtypes.ColumnExpr{}, qbtypes.ErrNotSelectable
	}
	return querybuilder.DefaultRead(ctx, q, m, logical)
}
