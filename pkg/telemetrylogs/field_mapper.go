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
	metadataStore telemetrytypes.MetadataStore
}

func NewFieldMapper(metadataStore telemetrytypes.MetadataStore) qbtypes.FieldMapper {
	return &fieldMapper{
		metadataStore: metadataStore,
	}
}

func (m *fieldMapper) getColumn(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
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

func (m *fieldMapper) FieldFor(ctx context.Context, orgID valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey, evolutions []*telemetrytypes.EvolutionEntry) (string, error) {
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	var newColumns []*schema.Column
	var evolutionsEntries []*telemetrytypes.EvolutionEntry
	if len(evolutions) > 0 {
		// hardcoded for now, make it dynamic while supporting JSON
		fieldName := "__all__"
		// we will use the corresponding column and its evolution entry for the query
		newColumns, evolutionsEntries, err = selectEvolutionsForColumns(columns, evolutions, tsStart, tsEnd, fieldName)
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
				switch column.Type.GetType() {
				case schema.ColumnTypeEnumJSON:
					exprs = append(exprs, fmt.Sprintf("%s.`%s`", columnName, key.Name))
					existExpr = append(existExpr, fmt.Sprintf("%s.`%s` IS NOT NULL", columnName, key.Name))
				case schema.ColumnTypeEnumMap:
					exprs = append(exprs, fmt.Sprintf("%s['%s']", columnName, key.Name))
					existExpr = append(existExpr, fmt.Sprintf("mapContains(%s, '%s')", columnName, key.Name))
				}
			case telemetrytypes.FieldContextBody:
				if querybuilder.BodyJSONQueryEnabled && (strings.Contains(key.Name, telemetrytypes.ArraySep) || strings.Contains(key.Name, telemetrytypes.ArrayAnyIndex)) {
					return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "FieldFor not supported for the Array Paths: %s", key.Name)
				}
				if key.JSONDataType == nil {
					return "", qbtypes.ErrColumnNotFound
				}

				fieldExpr := BodyJSONColumnPrefix + fmt.Sprintf("`%s`", key.Name)
				expr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldExpr, key.JSONDataType.StringValue())
				if key.Materialized {
					promotedFieldExpr := BodyPromotedColumnPrefix + fmt.Sprintf("`%s`", key.Name)
					expr = fmt.Sprintf("coalesce(%s, %s)", expr, fmt.Sprintf("dynamicElement(%s, '%s')", promotedFieldExpr, key.JSONDataType.StringValue()))
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
		for len(existExpr) < len(exprs) {
			// For expressions without existExpr, use a default check
			// This shouldn't happen in normal cases, but we handle it for safety
			existExpr = append(existExpr, "1 = 1")
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

func (m *fieldMapper) ColumnFor(ctx context.Context, _ valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	evolutions []*telemetrytypes.EvolutionEntry,
) (string, error) {

	colName, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, field, evolutions)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		// we try to use the context we know of
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			// is it a static field?
			if _, ok := logsV2Columns[field.Name]; ok {
				// if it is, attach the column name directly
				field.FieldContext = telemetrytypes.FieldContextLog
				colName, _ = m.FieldFor(ctx, orgID, tsStart, tsEnd, field, evolutions)
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
			colName, _ = m.FieldFor(ctx, orgID, tsStart, tsEnd, keysForField[0], evolutions)
		} else {
			// select any non-empty value from the keys
			args := []string{}
			for _, key := range keysForField {
				colName, _ = m.FieldFor(ctx, orgID, tsStart, tsEnd, key, evolutions)
				args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", colName, colName))
			}
			colName = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}
