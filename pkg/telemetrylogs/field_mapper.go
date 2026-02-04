package telemetrylogs

import (
	"context"
	"fmt"
	"strings"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
		LogsV2BodyJSONColumn: {Name: LogsV2BodyJSONColumn, Type: schema.JSONColumnType{
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
}

func NewFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
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
		// Body context is for JSON body fields
		// Use body_json if feature flag is enabled
		if querybuilder.BodyJSONQueryEnabled {
			return []*schema.Column{logsV2Columns[LogsV2BodyJSONColumn]}, nil
		}
		// Fall back to legacy body column
		return []*schema.Column{logsV2Columns["body"]}, nil
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			// check if the key has body JSON search
			if strings.HasPrefix(key.Name, telemetrytypes.BodyJSONStringSearchPrefix) {
				// Use body_json if feature flag is enabled and we have a body condition builder
				if querybuilder.BodyJSONQueryEnabled {
					return []*schema.Column{logsV2Columns[LogsV2BodyJSONColumn]}, nil
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

// selectEvolutionsForColumns selects the appropriate evolution entries for each column based on the time range.
// Assumes: evolutions are sorted and there's exactly one evolution per column.
// Logic:
//   - Finds the latest base evolution (<= tsStartTime) across ALL columns
//   - Rejects all evolutions before this latest base evolution
//   - For each column, includes its evolution if it's >= latest base evolution and <= tsEndTime
//   - Results are sorted by ReleaseTime descending (newest first)
func selectEvolutionsForColumns(columns []*schema.Column, evolutions []*telemetrytypes.EvolutionEntry, tsStart, tsEnd uint64, fieldName string) ([]*schema.Column, []*telemetrytypes.EvolutionEntry, error) {

	tsStartTime := time.Unix(0, int64(tsStart))
	tsEndTime := time.Unix(0, int64(tsEnd))

	// Build evolution map: column name -> evolution (one evolution per column)
	evolutionMap := make(map[string]*telemetrytypes.EvolutionEntry)
	for _, evolution := range evolutions {
		if _, exists := evolutionMap[evolution.ColumnName+":"+evolution.FieldName]; exists {
			// since if there is duplicate we would just use the oldest one.
			continue
		}
		evolutionMap[evolution.ColumnName+":"+evolution.FieldName] = evolution
	}

	// Find the latest base evolution (<= tsStartTime) across ALL columns
	// Evolutions are sorted, so we can break early
	var latestBaseEvolutionAcrossAll *telemetrytypes.EvolutionEntry
	for _, evolution := range evolutions {
		if evolution.ReleaseTime.After(tsStartTime) {
			break
		}
		latestBaseEvolutionAcrossAll = evolution
	}

	if latestBaseEvolutionAcrossAll == nil {
		return nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "no base evolution found for columns %v", columns)
	}

	// Collect column-evolution pairs
	type colEvoPair struct {
		column    *schema.Column
		evolution *telemetrytypes.EvolutionEntry
	}
	pairs := []colEvoPair{}

	for _, column := range columns {
		var evolution *telemetrytypes.EvolutionEntry
		var exists bool

		// First, try to find evolution with the specific fieldName
		evolution, exists = evolutionMap[column.Name+":"+fieldName]

		// If not found and fieldName is not "__all__", fall back to "__all__"
		if !exists && fieldName != "__all__" {
			evolution, exists = evolutionMap[column.Name+":__all__"]
		}

		if !exists {
			continue
		}

		// skip evolutions after tsEndTime
		if evolution.ReleaseTime.After(tsEndTime) || evolution.ReleaseTime.Equal(tsEndTime) {
			continue
		}

		// Reject evolutions before the latest base evolution
		if evolution.ReleaseTime.Before(latestBaseEvolutionAcrossAll.ReleaseTime) {
			continue
		}

		pairs = append(pairs, colEvoPair{column, evolution})
	}

	// If no pairs found, fall back to latestBaseEvolutionAcrossAll for matching columns
	if len(pairs) == 0 {
		for _, column := range columns {
			// Use latestBaseEvolutionAcrossAll if this column name matches its column name
			if column.Name == latestBaseEvolutionAcrossAll.ColumnName {
				pairs = append(pairs, colEvoPair{column, latestBaseEvolutionAcrossAll})
			}
		}
	}

	// Sort by ReleaseTime descending (newest first)
	for i := 0; i < len(pairs)-1; i++ {
		for j := i + 1; j < len(pairs); j++ {
			if pairs[i].evolution.ReleaseTime.Before(pairs[j].evolution.ReleaseTime) {
				pairs[i], pairs[j] = pairs[j], pairs[i]
			}
		}
	}

	// Extract results
	newColumns := make([]*schema.Column, len(pairs))
	evolutionsEntries := make([]*telemetrytypes.EvolutionEntry, len(pairs))
	for i, pair := range pairs {
		newColumns[i] = pair.column
		evolutionsEntries[i] = pair.evolution
	}

	return newColumns, evolutionsEntries, nil
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
		newColumns, evolutionsEntries, err = selectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd, key.Name)
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
				if key.JSONDataType == nil {
					return "", qbtypes.ErrColumnNotFound
				}

				if key.KeyNameContainsArray() && !key.JSONDataType.IsArray {
					return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "FieldFor not supported for nested fields; only supported for flat paths (e.g. body.status.detail) and paths of Array type: %s(%s)", key.Name, key.FieldDataType)
				}
				expr, err := m.buildFieldForJSON(key)
				if err != nil {
					return "", err
				}

				exprs = append(exprs, expr)
			default:
				return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource/body context fields are supported for json columns, got %s", key.FieldContext.String)
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
			return column.Name, nil
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
				// a key could have been materialized, if so return the materialized column name
				if key.Materialized {
					return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
				}
				exprs = append(exprs, fmt.Sprintf("%s['%s']", columnName, key.Name))
				existExpr = append(existExpr, fmt.Sprintf("mapContains(%s, '%s')", columnName, key.Name))
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
			return "", errors.New(errors.TypeInternal, errors.CodeInternal, "length of exist exprs doesn't match to that of exprs")
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

	colName, err := m.FieldFor(ctx, tsStart, tsEnd, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		// we try to use the context we know of
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			// is it a static field?
			if _, ok := logsV2Columns[field.Name]; ok {
				// if it is, attach the column name directly
				field.FieldContext = telemetrytypes.FieldContextLog
				colName, _ = m.FieldFor(ctx, tsStart, tsEnd, field)
			} else {
				// - the context is not provided
				// - there are not keys for the field
				// - it is not a static field
				// - the next best thing to do is see if there is a typo
				// and suggest a correction
				correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
				if found {
					// we found a close match, in the error message send the suggestion
					return "", errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
				} else {
					// not even a close match, return an error
					return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
				}
			}
		} else if len(keysForField) == 1 {
			// we have a single key for the field, use it
			colName, _ = m.FieldFor(ctx, tsStart, tsEnd, keysForField[0])
		} else {
			// select any non-empty value from the keys
			args := []string{}
			for _, key := range keysForField {
				colName, _ = m.FieldFor(ctx, tsStart, tsEnd, key)
				args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", colName, colName))
			}
			colName = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}

// buildFieldForJSON builds the field expression for body JSON fields using arrayConcat pattern
func (m *fieldMapper) buildFieldForJSON(key *telemetrytypes.TelemetryFieldKey) (string, error) {
	plan := key.JSONPlan
	if len(plan) == 0 {
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput,
			"Could not find any valid paths for: %s", key.Name)
	}

	if plan[0].IsTerminal {
		node := plan[0]

		expr := fmt.Sprintf("dynamicElement(%s, '%s')", node.FieldPath(), node.TerminalConfig.ElemType.StringValue())
		if key.Materialized {
			if len(plan) < 2 {
				return "", errors.Newf(errors.TypeUnexpected, CodePromotedPlanMissing,
					"plan length is less than 2 for promoted path: %s", key.Name)
			}

			// promoted column first then body_json column
			// TODO(Piyush): Change this in future for better performance
			expr = fmt.Sprintf("coalesce(%s, %s)",
				fmt.Sprintf("dynamicElement(%s, '%s')", plan[1].FieldPath(), plan[1].TerminalConfig.ElemType.StringValue()),
				expr,
			)
		}

		return expr, nil
	}

	// Build arrayConcat pattern directly from the tree structure
	arrayConcatExpr, err := m.buildArrayConcat(plan)
	if err != nil {
		return "", err
	}

	return arrayConcatExpr, nil
}

// buildArrayConcat builds the arrayConcat pattern directly from the tree structure
func (m *fieldMapper) buildArrayConcat(plan telemetrytypes.JSONAccessPlan) (string, error) {
	if len(plan) == 0 {
		return "", errors.Newf(errors.TypeInternal, CodeGroupByPlanEmpty, "group by plan is empty while building arrayConcat")
	}

	// Build arrayMap expressions for ALL available branches at the root level.
	// Iterate branches in deterministic order (JSON then Dynamic) so generated SQL
	// is stable across environments; map iteration order is random in Go.
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
		return "", errors.Newf(errors.TypeInternal, CodeArrayMapExpressionsEmpty, "array map expressions are empty while building arrayConcat")
	}

	// Build the arrayConcat expression
	arrayConcatExpr := fmt.Sprintf("arrayConcat(%s)", strings.Join(arrayMapExpressions, ", "))

	// Wrap with arrayFlatten
	arrayFlattenExpr := fmt.Sprintf("arrayFlatten(%s)", arrayConcatExpr)

	return arrayFlattenExpr, nil
}

// buildArrayMap builds the arrayMap expression for a specific branch, handling all sub-branches
func (m *fieldMapper) buildArrayMap(currentNode *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType) (string, error) {
	if currentNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeCurrentNodeNil, "current node is nil while building arrayMap")
	}

	childNode := currentNode.Branches[branchType]
	if childNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeChildNodeNil, "child node is nil while building arrayMap")
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
		return "", errors.Newf(errors.TypeInternal, CodeNestedExpressionsEmpty, "nested expressions are empty while building arrayMap")
	}

	return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), nestedExpr, arrayExpr), nil
}
