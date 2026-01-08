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
	"github.com/SigNoz/signoz/pkg/types/authtypes"
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

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return logsV2Columns["resource"], nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return logsV2Columns["scope_name"], nil
		case "version", "scope.version", "scope_version":
			return logsV2Columns["scope_version"], nil
		}
		return logsV2Columns["scope_string"], nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return logsV2Columns["attributes_string"], nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return logsV2Columns["attributes_number"], nil
		case telemetrytypes.FieldDataTypeBool:
			return logsV2Columns["attributes_bool"], nil
		}
	case telemetrytypes.FieldContextBody:
		// Body context is for JSON body fields
		// Use body_json if feature flag is enabled
		if querybuilder.BodyJSONQueryEnabled {
			return logsV2Columns[LogsV2BodyJSONColumn], nil
		}
		// Fall back to legacy body column
		return logsV2Columns["body"], nil
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			// check if the key has body JSON search
			if strings.HasPrefix(key.Name, telemetrytypes.BodyJSONStringSearchPrefix) {
				// Use body_json if feature flag is enabled and we have a body condition builder
				if querybuilder.BodyJSONQueryEnabled {
					return logsV2Columns[LogsV2BodyJSONColumn], nil
				}
				// Fall back to legacy body column
				return logsV2Columns["body"], nil
			}
			return nil, qbtypes.ErrColumnNotFound
		}
		return col, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func buildEvolutionMultiIfExpression(evolutions []*telemetrytypes.ColumnEvolutionMetadata, key *telemetrytypes.TelemetryFieldKey, tsStartTime time.Time, tsEndTime time.Timex) string {

	// Collect relevant evolutions for the time range [tsStart, tsEnd]
	// Strategy:
	// 1. Include only the latest evolution with releaseTime <= tsStartTime (for backward compatibility)
	// 2. Include all evolutions with releaseTime > tsStartTime and <= tsEndTime (active during query range)
	// 3. Order from newest to oldest so multiIf checks newest columns first
	// 4. Add baseColExpr as final fallback if required
	relevantEvolutionsColumnExprs := []string{}
	relevantEvolutionsColumnExistsExprs := []string{}
	var latestBeforeStartColumnExistsExpr string
	var latestBeforeStartColumnExpr string

	// Helper function to build column expression from evolution
	buildColumnExpr := func(evolution *telemetrytypes.ColumnEvolutionMetadata) (string, string) {
		// TODO: instead of string comparison, we can parse the column type and then compare the types
		if strings.HasPrefix(evolution.NewColumnType, "JSON(") {
			existsExpr := fmt.Sprintf("%s.`%s` IS NOT NULL", evolution.NewColumn, key.Name)
			columnExpr := fmt.Sprintf("%s.`%s`::String", evolution.NewColumn, key.Name)
			return existsExpr, columnExpr
		} else if evolution.NewColumnType == "Map(LowCardinality(String), String)" {
			existsExpr := fmt.Sprintf("mapContains(%s, '%s')", evolution.NewColumn, key.Name)
			columnExpr := fmt.Sprintf("%s['%s']", evolution.NewColumn, key.Name)
			return existsExpr, columnExpr
		}
		return "", ""
	}

	// assuming evolutions are sorted by increasing release time
	for _, evolution := range evolutions {
		// break evolutions released after the query range since it is sorted by increasing release time
		if evolution.ReleaseTime.After(tsEndTime) || evolution.ReleaseTime.Equal(tsEndTime) {
			break
		}

		existsExpr, columnExpr := buildColumnExpr(evolution)

		// If evolution was released before or at tsStartTime, track it as the latest one
		// Since evolutions are sorted by increasing release time, the last one we see is the latest
		if evolution.ReleaseTime.Before(tsStartTime) {
			latestBeforeStartColumnExistsExpr = existsExpr
			latestBeforeStartColumnExpr = columnExpr
		} else if evolution.ReleaseTime.After(tsStartTime) || evolution.ReleaseTime.Equal(tsStartTime) {
			// Evolution was released after tsStartTime, include it
			relevantEvolutionsColumnExistsExprs = append(relevantEvolutionsColumnExistsExprs, existsExpr)
			relevantEvolutionsColumnExprs = append(relevantEvolutionsColumnExprs, columnExpr)
		}
	}

	// Reverse the order so we check newest columns first (since evolutions are sorted by increasing release time)
	// multiIf checks conditions in order, so we want: newest -> ... -> oldest -> base -> NULL
	for i, j := 0, len(relevantEvolutionsColumnExistsExprs)-1; i < j; i, j = i+1, j-1 {
		relevantEvolutionsColumnExistsExprs[i], relevantEvolutionsColumnExistsExprs[j] = relevantEvolutionsColumnExistsExprs[j], relevantEvolutionsColumnExistsExprs[i]
	}
	for i, j := 0, len(relevantEvolutionsColumnExprs)-1; i < j; i, j = i+1, j-1 {
		relevantEvolutionsColumnExprs[i], relevantEvolutionsColumnExprs[j] = relevantEvolutionsColumnExprs[j], relevantEvolutionsColumnExprs[i]
	}

	// Add the latest evolution before/at tsStartTime at the end (it's older than the ones after tsStartTime)
	if latestBeforeStartColumnExistsExpr != "" && latestBeforeStartColumnExpr != "" {
		relevantEvolutionsColumnExistsExprs = append(relevantEvolutionsColumnExistsExprs, latestBeforeStartColumnExistsExpr)
		relevantEvolutionsColumnExprs = append(relevantEvolutionsColumnExprs, latestBeforeStartColumnExpr)
	}

	return "multiIf(" + strings.Join(relevantEvolutions, ", ") + ", NULL)"

}

func (m *fieldMapper) FieldFor(ctx context.Context, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	column, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type.GetType() {
	case schema.ColumnTypeEnumJSON:
		switch key.FieldContext {
		case telemetrytypes.FieldContextResource:
			// json is only supported for resource context as of now
			if key.FieldContext != telemetrytypes.FieldContextResource {
				return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource context fields are supported for json columns, got %s", key.FieldContext.String)
			}

			baseColumn := logsV2Columns["resources_string"]
			tsStartTime := time.Unix(0, int64(tsStart))
			tsEndTime := time.Unix(0, int64(tsEnd))

			// Extract orgId from context
			var orgID valuer.UUID
			if claims, err := authtypes.ClaimsFromContext(ctx); err == nil {
				orgID, err = valuer.NewUUID(claims.OrgID)
				if err != nil {
					return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid orgId %s", claims.OrgID)
				}
			} else {
				return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no orgId found in context")
			}

			defaultColumn := fmt.Sprintf("%s['%s']", baseColumn.Name, key.Name)
			// baseColExpr := ""
			// // Fallback when no evolutions exist
			// if key.Materialized {
			// 	oldKeyName := telemetrytypes.FieldKeyToMaterializedColumnName(key)
			// 	oldKeyNameExists := telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
			// 	baseColExpr = fmt.Sprintf("%s==true, %s", oldKeyNameExists, oldKeyName)
			// } else {
			// 	attrVal := fmt.Sprintf("%s['%s']", baseColumn.Name, key.Name)
			// 	baseColExpr = fmt.Sprintf("mapContains(%s, '%s'), %s", baseColumn.Name, key.Name, attrVal)
			// }

			// get all evolution for the column
			evolutions := m.metadataStore.GetColumnEvolutionMetadata(ctx, orgID, baseColumn.Name, defaultColumn)

			data := buildEvolutionMultiIfExpression(evolutions, key, tsStartTime, tsEndTime)
			return data, nil
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
			return expr, nil
		default:
			return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource/body context fields are supported for json columns, got %s", key.FieldContext.String)
		}

	case schema.ColumnTypeEnumLowCardinality:
		switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
		case schema.ColumnTypeEnumString:
			return column.Name, nil
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
			return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
		}
	}
	// should not reach here
	return column.Name, nil
}

func (m *fieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
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
