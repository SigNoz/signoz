package telemetrymetadata

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"
)

var (
	ErrFailedToGetTracesKeys    = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get traces keys")
	ErrFailedToGetLogsKeys      = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get logs keys")
	ErrFailedToGetTblStatement  = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get tbl statement")
	ErrFailedToGetMetricsKeys   = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get metrics keys")
	ErrFailedToGetMeterKeys     = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get meter keys")
	ErrFailedToGetMeterValues   = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get meter values")
	ErrFailedToGetRelatedValues = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get related values")
)

type telemetryMetaStore struct {
	logger                    *slog.Logger
	telemetrystore            telemetrystore.TelemetryStore
	tracesDBName              string
	tracesFieldsTblName       string
	spanAttributesKeysTblName string
	indexV3TblName            string
	metricsDBName             string
	metricsFieldsTblName      string
	meterDBName               string
	meterFieldsTblName        string
	logsDBName                string
	logsFieldsTblName         string
	logAttributeKeysTblName   string
	logResourceKeysTblName    string
	logsV2TblName             string
	relatedMetadataDBName     string
	relatedMetadataTblName    string

	fm               qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
}

func escapeForLike(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, `_`, `\_`), `%`, `\%`)
}

func NewTelemetryMetaStore(
	settings factory.ProviderSettings,
	telemetrystore telemetrystore.TelemetryStore,
	tracesDBName string,
	tracesFieldsTblName string,
	spanAttributesKeysTblName string,
	indexV3TblName string,
	metricsDBName string,
	metricsFieldsTblName string,
	meterDBName string,
	meterFieldsTblName string,
	logsDBName string,
	logsV2TblName string,
	logsFieldsTblName string,
	logAttributeKeysTblName string,
	logResourceKeysTblName string,
	relatedMetadataDBName string,
	relatedMetadataTblName string,
) telemetrytypes.MetadataStore {
	metadataSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymetadata")

	t := &telemetryMetaStore{
		logger:                    metadataSettings.Logger(),
		telemetrystore:            telemetrystore,
		tracesDBName:              tracesDBName,
		tracesFieldsTblName:       tracesFieldsTblName,
		spanAttributesKeysTblName: spanAttributesKeysTblName,
		indexV3TblName:            indexV3TblName,
		metricsDBName:             metricsDBName,
		metricsFieldsTblName:      metricsFieldsTblName,
		meterDBName:               meterDBName,
		meterFieldsTblName:        meterFieldsTblName,
		logsDBName:                logsDBName,
		logsV2TblName:             logsV2TblName,
		logsFieldsTblName:         logsFieldsTblName,
		logAttributeKeysTblName:   logAttributeKeysTblName,
		logResourceKeysTblName:    logResourceKeysTblName,
		relatedMetadataDBName:     relatedMetadataDBName,
		relatedMetadataTblName:    relatedMetadataTblName,
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	t.fm = fm
	t.conditionBuilder = conditionBuilder

	return t
}

// tracesTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the traces table
func (t *telemetryMetaStore) tracesTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.tracesDBName, t.indexV3TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalTraces
	}

	return materialisedKeys, nil
}

// getTracesKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getTracesKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	// pre-fetch the materialised keys from the traces table
	matKeys, err := t.tracesTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	sb := sqlbuilder.Select(
		"tagKey AS tag_key",
		"tagType AS tag_type",
		"dataType AS tag_data_type",
		`CASE
			// WHEN tagType = 'spanfield' THEN 1
			WHEN tagType = 'resource' THEN 2
			// WHEN tagType = 'scope' THEN 3
			WHEN tagType = 'tag' THEN 4
			ELSE 5
		END as priority`,
	).From(t.tracesDBName + "." + t.spanAttributesKeysTblName)
	var limit int

	searchTexts := []string{}
	dataTypes := []telemetrytypes.FieldDataType{}

	conds := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {

		// TODO(srikanthccv): support time filtering for span attribute keys
		// if fieldKeySelector.StartUnixMilli != 0 {
		// 	conds = append(conds, sb.GE("unix_milli", fieldKeySelector.StartUnixMilli))
		// }
		// if fieldKeySelector.EndUnixMilli != 0 {
		// 	conds = append(conds, sb.LE("unix_milli", fieldKeySelector.EndUnixMilli))
		// }

		// key part of the selector
		fieldKeyConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tagKey", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.ILike("tagKey", "%"+escapeForLike(fieldKeySelector.Name)+"%"))
		}

		searchTexts = append(searchTexts, fieldKeySelector.Name)
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			dataTypes = append(dataTypes, fieldKeySelector.FieldDataType)
		}
		// now look at the field context
		// we don't write most of intrinsic fields to keys table
		// for this reason we don't want to apply tagType if the field context
		// is not attribute or resource attribute
		if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified &&
			(fieldKeySelector.FieldContext == telemetrytypes.FieldContextAttribute ||
				fieldKeySelector.FieldContext == telemetrytypes.FieldContextResource) {
			fieldKeyConds = append(fieldKeyConds, sb.E("tagType", fieldKeySelector.FieldContext.TagType()))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("dataType", fieldKeySelector.FieldDataType.TagDataType()))
		}

		conds = append(conds, sb.And(fieldKeyConds...))
		limit += fieldKeySelector.Limit
	}
	// the span_attribute_keys has historically pushed the top level column as attributes
	sb.Where(sb.Or(conds...)).Where("isColumn = false")
	sb.GroupBy("tagKey", "tagType", "dataType")
	if limit == 0 {
		limit = 1000
	}

	mainSb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("tag_key", "tag_type", "tag_data_type")
	mainSb.OrderBy("priority")
	// query one extra to check if we hit the limit
	mainSb.Limit(limit + 1)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}
	defer rows.Close()
	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
		}
		key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

		// if there is no materialised column, create a key with the field context and data type
		if !ok {
			key = &telemetrytypes.TelemetryFieldKey{
				Name:          name,
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  fieldContext,
				FieldDataType: fieldDataType,
			}
		}

		keys = append(keys, key)
		mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()] = key
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	// hit the limit? (only counting DB results)
	complete := rowCount <= limit

	staticKeys := []string{"isRoot", "isEntryPoint"}
	staticKeys = append(staticKeys, maps.Keys(telemetrytraces.IntrinsicFields)...)
	staticKeys = append(staticKeys, maps.Keys(telemetrytraces.CalculatedFields)...)

	// Add matching intrinsic and matching calculated fields
	// These don't count towards the limit
	for _, key := range staticKeys {
		found := false
		for _, v := range searchTexts {
			if v == "" || strings.Contains(key, v) {
				found = true
				break
			}
		}

		// skip the keys that don't match data type
		if field, exists := telemetrytraces.IntrinsicFields[key]; exists {
			if len(dataTypes) > 0 &&
				slices.Index(dataTypes, field.FieldDataType) == -1 &&
				field.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				continue
			}
		}

		if field, exists := telemetrytraces.CalculatedFields[key]; exists {
			if len(dataTypes) > 0 &&
				slices.Index(dataTypes, field.FieldDataType) == -1 &&
				field.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				continue
			}
		}

		if found {
			if field, exists := telemetrytraces.IntrinsicFields[key]; exists {
				if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; !added {
					keys = append(keys, &field)
				}
				continue
			}

			if field, exists := telemetrytraces.CalculatedFields[key]; exists {
				if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; !added {
					keys = append(keys, &field)
				}
				continue
			}
			keys = append(keys, &telemetrytypes.TelemetryFieldKey{
				Name:         key,
				FieldContext: telemetrytypes.FieldContextSpan,
				Signal:       telemetrytypes.SignalTraces,
			})
		}
	}
	return keys, complete, nil
}

// logsTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the logs table
func (t *telemetryMetaStore) logsTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.logsDBName, t.logsV2TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalLogs
	}

	return materialisedKeys, nil
}

// getLogsKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getLogsKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	// pre-fetch the materialised keys from the logs table
	matKeys, err := t.logsTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	// queries for both attribute and resource keys tables
	var queries []string
	var allArgs []any

	// tables to query based on field selectors
	queryAttributeTable := false
	queryResourceTable := false

	for _, selector := range fieldKeySelectors {
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified {
			// unspecified context, query both tables
			queryAttributeTable = true
			queryResourceTable = true
			break
		} else if selector.FieldContext == telemetrytypes.FieldContextAttribute {
			queryAttributeTable = true
		} else if selector.FieldContext == telemetrytypes.FieldContextResource {
			queryResourceTable = true
		}
	}

	tablesToQuery := []struct {
		fieldContext telemetrytypes.FieldContext
		shouldQuery  bool
	}{
		{telemetrytypes.FieldContextAttribute, queryAttributeTable},
		{telemetrytypes.FieldContextResource, queryResourceTable},
	}

	for _, table := range tablesToQuery {
		if !table.shouldQuery {
			continue
		}

		fieldContext := table.fieldContext

		// table name based on field context
		var tblName string
		if fieldContext == telemetrytypes.FieldContextAttribute {
			tblName = t.logsDBName + "." + t.logAttributeKeysTblName
		} else {
			tblName = t.logsDBName + "." + t.logResourceKeysTblName
		}

		sb := sqlbuilder.Select(
			"name AS tag_key",
			fmt.Sprintf("'%s' AS tag_type", fieldContext.TagType()),
			"lower(datatype) AS tag_data_type", // in logs, we had some historical data with capital and small case
			fmt.Sprintf(`%d AS priority`, getPriorityForContext(fieldContext)),
		).From(tblName)

		var limit int
		conds := []string{}

		for _, fieldKeySelector := range fieldKeySelectors {
			// Include this selector if:
			// 1. It has unspecified context (matches all tables)
			// 2. Its context matches the current table's context
			if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified &&
				fieldKeySelector.FieldContext != fieldContext {
				continue
			}

			// key part of the selector
			fieldKeyConds := []string{}
			if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
				fieldKeyConds = append(fieldKeyConds, sb.E("name", fieldKeySelector.Name))
			} else {
				fieldKeyConds = append(fieldKeyConds, sb.ILike("name", "%"+escapeForLike(fieldKeySelector.Name)+"%"))
			}

			// now look at the field data type
			if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				fieldKeyConds = append(fieldKeyConds, sb.E("datatype", fieldKeySelector.FieldDataType.TagDataType()))
			}

			if len(fieldKeyConds) > 0 {
				conds = append(conds, sb.And(fieldKeyConds...))
			}
			limit += fieldKeySelector.Limit
		}

		if len(conds) > 0 {
			sb.Where(sb.Or(conds...))
		}

		sb.GroupBy("name", "datatype")
		if limit == 0 {
			limit = 1000
		}

		query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		queries = append(queries, query)
		allArgs = append(allArgs, args...)
	}

	if len(queries) == 0 {
		// No matching contexts, return empty result
		return []*telemetrytypes.TelemetryFieldKey{}, true, nil
	}

	// Combine queries with UNION ALL
	var limit int
	for _, fieldKeySelector := range fieldKeySelectors {
		limit += fieldKeySelector.Limit
	}
	if limit == 0 {
		limit = 1000
	}

	mainQuery := fmt.Sprintf(`
		SELECT tag_key, tag_type, tag_data_type, max(priority) as priority
		FROM (
			%s
		) AS combined_results
		GROUP BY tag_key, tag_type, tag_data_type
		ORDER BY priority
		LIMIT %d
	`, strings.Join(queries, " UNION ALL "), limit+1)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, mainQuery, allArgs...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()

	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	searchTexts := []string{}
	dataTypes := []telemetrytypes.FieldDataType{}

	// Collect search texts and data types for static field matching
	for _, fieldKeySelector := range fieldKeySelectors {
		searchTexts = append(searchTexts, fieldKeySelector.Name)
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			dataTypes = append(dataTypes, fieldKeySelector.FieldDataType)
		}
	}

	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
		key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

		// if there is no materialised column, create a key with the field context and data type
		if !ok {
			key = &telemetrytypes.TelemetryFieldKey{
				Name:          name,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  fieldContext,
				FieldDataType: fieldDataType,
			}
		}

		keys = append(keys, key)
		mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()] = key
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}

	// hit the limit? (only counting DB results)
	complete := rowCount <= limit

	staticKeys := []string{}
	staticKeys = append(staticKeys, maps.Keys(telemetrylogs.IntrinsicFields)...)

	// Add matching intrinsic and matching calculated fields
	// These don't count towards the limit
	for _, key := range staticKeys {
		found := false
		for _, v := range searchTexts {
			if v == "" || strings.Contains(key, v) {
				found = true
				break
			}
		}

		// skip the keys that don't match data type
		if field, exists := telemetrylogs.IntrinsicFields[key]; exists {
			if len(dataTypes) > 0 &&
				slices.Index(dataTypes, field.FieldDataType) == -1 &&
				field.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				continue
			}
		}

		if found {
			if field, exists := telemetrylogs.IntrinsicFields[key]; exists {
				if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; !added {
					keys = append(keys, &field)
				}
				continue
			}

			keys = append(keys, &telemetrytypes.TelemetryFieldKey{
				Name:         key,
				FieldContext: telemetrytypes.FieldContextLog,
				Signal:       telemetrytypes.SignalLogs,
			})
		}
	}

	return keys, complete, nil
}

func getPriorityForContext(ctx telemetrytypes.FieldContext) int {
	switch ctx {
	case telemetrytypes.FieldContextLog:
		return 1
	case telemetrytypes.FieldContextResource:
		return 2
	case telemetrytypes.FieldContextScope:
		return 3
	case telemetrytypes.FieldContextAttribute:
		return 4
	default:
		return 5
	}
}

// getMetricsKeys returns the keys from the metrics that match the field selection criteria
func (t *telemetryMetaStore) getMetricsKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	sb := sqlbuilder.
		Select("attr_name as name", "attr_type as field_context", "attr_datatype as field_data_type", `
			CASE
				WHEN attr_type = 'resource' THEN 1
				WHEN attr_type = 'scope' THEN 2
				WHEN attr_type = 'point' THEN 3
				ELSE 4
			END as priority`).
		From(t.metricsDBName + "." + t.metricsFieldsTblName)

	var limit int

	conds := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {
		fieldConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldConds = append(fieldConds, sb.E("attr_name", fieldKeySelector.Name))
		} else {
			fieldConds = append(fieldConds, sb.ILike("attr_name", "%"+escapeForLike(fieldKeySelector.Name)+"%"))
		}
		fieldConds = append(fieldConds, sb.NotLike("attr_name", "\\_\\_%"))

		// note: type and datatype do not have much significance in metrics

		// if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		// 	fieldConds = append(fieldConds, sb.E("attr_type", fieldKeySelector.FieldContext.TagType()))
		// }

		// if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		// 	fieldConds = append(fieldConds, sb.E("attr_datatype", fieldKeySelector.FieldDataType.TagDataType()))
		// }

		if fieldKeySelector.MetricContext != nil {
			fieldConds = append(fieldConds, sb.E("metric_name", fieldKeySelector.MetricContext.MetricName))
		}

		conds = append(conds, sb.And(fieldConds...))
		limit += fieldKeySelector.Limit
	}
	sb.Where(sb.Or(conds...))
	sb.GroupBy("name", "field_context", "field_data_type")

	if limit == 0 {
		limit = 1000
	}

	mainSb := sqlbuilder.Select("name", "field_context", "field_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("name", "field_context", "field_data_type")
	mainSb.OrderBy("priority")
	// query one extra to check if we hit the limit
	mainSb.Limit(limit + 1)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  fieldContext,
			FieldDataType: fieldDataType,
		})
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}

	// hit the limit?
	complete := rowCount <= limit

	return keys, complete, nil
}

// getMeterKeys returns the keys from the meter metrics that match the field selection criteria
func (t *telemetryMetaStore) getMeterSourceMetricKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	sb := sqlbuilder.Select("DISTINCT arrayJoin(JSONExtractKeys(labels)) as attr_name").From(t.meterDBName + "." + t.meterFieldsTblName)
	conds := []string{}
	var limit int
	for _, fieldKeySelector := range fieldKeySelectors {
		fieldConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldConds = append(fieldConds, sb.E("attr_name", fieldKeySelector.Name))
		} else {
			fieldConds = append(fieldConds, sb.Like("attr_name", "%"+fieldKeySelector.Name+"%"))
		}
		fieldConds = append(fieldConds, sb.NotLike("attr_name", "\\_\\_%"))

		if fieldKeySelector.MetricContext != nil {
			fieldConds = append(fieldConds, sb.E("metric_name", fieldKeySelector.MetricContext.MetricName))
		}

		conds = append(conds, sb.And(fieldConds...))
		limit += fieldKeySelector.Limit
	}
	sb.Where(sb.Or(conds...))
	if limit == 0 {
		limit = 1000
	}

	sb.Limit(limit)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
	}
	defer rows.Close()

	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		err = rows.Scan(&name)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
		}
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:   name,
			Signal: telemetrytypes.SignalMetrics,
		})
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
	}

	// hit the limit?
	complete := rowCount <= limit

	return keys, complete, nil

}

// applyBackwardCompatibleKeys adds backward compatible key aliases to the map
func applyBackwardCompatibleKeys(mapOfKeys map[string][]*telemetrytypes.TelemetryFieldKey) {
	// Get backward compatible keys for all signals
	backwardCompatKeysBySignal := map[telemetrytypes.Signal]BackwardCompatibleKeyMap{
		telemetrytypes.SignalTraces:  GetBackwardCompatKeysForSignal(telemetrytypes.SignalTraces),
		telemetrytypes.SignalLogs:    GetBackwardCompatKeysForSignal(telemetrytypes.SignalLogs),
		telemetrytypes.SignalMetrics: GetBackwardCompatKeysForSignal(telemetrytypes.SignalMetrics),
	}

	// Iterate over existing keys and add aliases if they exist in backward compat mapping
	for srcKey, srcKeys := range mapOfKeys {
		for _, srcKeyEntry := range srcKeys {
			backwardCompatKeys := backwardCompatKeysBySignal[srcKeyEntry.Signal]
			if backwardCompatKeys == nil {
				continue
			}

			if aliasKey, ok := backwardCompatKeys[srcKey]; ok {
				if _, aliasExists := mapOfKeys[aliasKey]; !aliasExists {
					aliasKeyEntry := &telemetrytypes.TelemetryFieldKey{
						Name:          aliasKey,
						Signal:        srcKeyEntry.Signal,
						FieldContext:  srcKeyEntry.FieldContext,
						FieldDataType: srcKeyEntry.FieldDataType,
					}
					mapOfKeys[aliasKey] = []*telemetrytypes.TelemetryFieldKey{aliasKeyEntry}
				}
				// Found the alias for this signal, no need to check other entries
				break
			}
		}
	}
}

func (t *telemetryMetaStore) GetKeys(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	var complete bool = true
	var err error
	selectors := []*telemetrytypes.FieldKeySelector{}

	if fieldKeySelector != nil {
		selectors = []*telemetrytypes.FieldKeySelector{fieldKeySelector}
	}

	switch fieldKeySelector.Signal {
	case telemetrytypes.SignalTraces:
		keys, complete, err = t.getTracesKeys(ctx, selectors)
	case telemetrytypes.SignalLogs:
		keys, complete, err = t.getLogsKeys(ctx, selectors)
	case telemetrytypes.SignalMetrics:
		if fieldKeySelector.Source == telemetrytypes.SourceMeter {
			keys, complete, err = t.getMeterSourceMetricKeys(ctx, selectors)
		} else {
			keys, complete, err = t.getMetricsKeys(ctx, selectors)
		}
	case telemetrytypes.SignalUnspecified:
		// get traces keys
		tracesKeys, tracesComplete, err := t.getTracesKeys(ctx, selectors)
		if err != nil {
			return nil, false, err
		}
		keys = append(keys, tracesKeys...)

		// get logs keys
		logsKeys, logsComplete, err := t.getLogsKeys(ctx, selectors)
		if err != nil {
			return nil, false, err
		}
		keys = append(keys, logsKeys...)

		// get metrics keys
		metricsKeys, metricsComplete, err := t.getMetricsKeys(ctx, selectors)
		if err != nil {
			return nil, false, err
		}
		keys = append(keys, metricsKeys...)

		complete = tracesComplete && logsComplete && metricsComplete
	}
	if err != nil {
		return nil, false, err
	}

	mapOfKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
	for _, key := range keys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}

	applyBackwardCompatibleKeys(mapOfKeys)

	return mapOfKeys, complete, nil
}

func (t *telemetryMetaStore) GetKeysMulti(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {

	logsSelectors := []*telemetrytypes.FieldKeySelector{}
	tracesSelectors := []*telemetrytypes.FieldKeySelector{}
	metricsSelectors := []*telemetrytypes.FieldKeySelector{}
	meterSourceMetricsSelectors := []*telemetrytypes.FieldKeySelector{}

	for _, fieldKeySelector := range fieldKeySelectors {
		switch fieldKeySelector.Signal {
		case telemetrytypes.SignalLogs:
			logsSelectors = append(logsSelectors, fieldKeySelector)
		case telemetrytypes.SignalTraces:
			tracesSelectors = append(tracesSelectors, fieldKeySelector)
		case telemetrytypes.SignalMetrics:
			if fieldKeySelector.Source == telemetrytypes.SourceMeter {
				meterSourceMetricsSelectors = append(meterSourceMetricsSelectors, fieldKeySelector)
			} else {
				metricsSelectors = append(metricsSelectors, fieldKeySelector)
			}
		case telemetrytypes.SignalUnspecified:
			logsSelectors = append(logsSelectors, fieldKeySelector)
			tracesSelectors = append(tracesSelectors, fieldKeySelector)
			metricsSelectors = append(metricsSelectors, fieldKeySelector)
		}
	}

	logsKeys, logsComplete, err := t.getLogsKeys(ctx, logsSelectors)
	if err != nil {
		return nil, false, err
	}
	tracesKeys, tracesComplete, err := t.getTracesKeys(ctx, tracesSelectors)
	if err != nil {
		return nil, false, err
	}
	metricsKeys, metricsComplete, err := t.getMetricsKeys(ctx, metricsSelectors)
	if err != nil {
		return nil, false, err
	}

	meterSourceMetricsKeys, _, err := t.getMeterSourceMetricKeys(ctx, meterSourceMetricsSelectors)
	if err != nil {
		return nil, false, err
	}
	// Complete only if all queries are complete
	complete := logsComplete && tracesComplete && metricsComplete

	mapOfKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
	for _, key := range logsKeys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}
	for _, key := range tracesKeys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}
	for _, key := range metricsKeys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}
	for _, key := range meterSourceMetricsKeys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}

	applyBackwardCompatibleKeys(mapOfKeys)

	return mapOfKeys, complete, nil
}

func (t *telemetryMetaStore) GetKey(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	keys, _, err := t.GetKeys(ctx, fieldKeySelector)
	if err != nil {
		return nil, err
	}
	return keys[fieldKeySelector.Name], nil
}

func (t *telemetryMetaStore) getRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {

	// nothing to return as "related" value if there is nothing to filter on
	if fieldValueSelector.ExistingQuery == "" {
		return nil, true, nil
	}

	key := &telemetrytypes.TelemetryFieldKey{
		Name:          fieldValueSelector.Name,
		Signal:        fieldValueSelector.Signal,
		FieldContext:  fieldValueSelector.FieldContext,
		FieldDataType: fieldValueSelector.FieldDataType,
	}

	selectColumn, err := t.fm.FieldFor(ctx, key)

	if err != nil {
		// we don't have a explicit column to select from the related metadata table
		// so we will select either from resource_attributes or attributes table
		// in that order
		resourceColumn, _ := t.fm.FieldFor(ctx, &telemetrytypes.TelemetryFieldKey{
			Name:          key.Name,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		attributeColumn, _ := t.fm.FieldFor(ctx, &telemetrytypes.TelemetryFieldKey{
			Name:          key.Name,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		selectColumn = fmt.Sprintf("if(notEmpty(%s), %s, %s)", resourceColumn, resourceColumn, attributeColumn)
	}

	sb := sqlbuilder.Select("DISTINCT " + selectColumn).From(t.relatedMetadataDBName + "." + t.relatedMetadataTblName)

	if len(fieldValueSelector.ExistingQuery) != 0 {
		keySelectors := querybuilder.QueryStringToKeysSelectors(fieldValueSelector.ExistingQuery)
		for _, keySelector := range keySelectors {
			keySelector.Signal = fieldValueSelector.Signal
		}
		keys, _, err := t.GetKeysMulti(ctx, keySelectors)
		if err != nil {
			return nil, false, err
		}

		whereClause, err := querybuilder.PrepareWhereClause(fieldValueSelector.ExistingQuery, querybuilder.FilterExprVisitorOpts{
			Logger:           t.logger,
			FieldMapper:      t.fm,
			ConditionBuilder: t.conditionBuilder,
			FieldKeys:        keys,
        }, 0, 0)
		if err == nil {
			sb.AddWhereClause(whereClause.WhereClause)
		} else {
			t.logger.WarnContext(ctx, "error parsing existing query for related values", "error", err)
		}
	}

	if fieldValueSelector.StartUnixMilli != 0 {
		sb.Where(sb.GE("unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli != 0 {
		sb.Where(sb.LE("unix_milli", fieldValueSelector.EndUnixMilli))
	}

	if fieldValueSelector.Value != "" {
		var conds []string
		if fieldValueSelector.FieldContext != telemetrytypes.FieldContextAttribute &&
			fieldValueSelector.FieldContext != telemetrytypes.FieldContextResource {
			origContext := key.FieldContext

			// search on attributes
			key.FieldContext = telemetrytypes.FieldContextAttribute
            cond, err := t.conditionBuilder.ConditionFor(ctx, key, qbtypes.FilterOperatorContains, fieldValueSelector.Value, sb, 0, 0)
			if err == nil {
				conds = append(conds, cond)
			}

			// search on resource
			key.FieldContext = telemetrytypes.FieldContextResource
            cond, err = t.conditionBuilder.ConditionFor(ctx, key, qbtypes.FilterOperatorContains, fieldValueSelector.Value, sb, 0, 0)
			if err == nil {
				conds = append(conds, cond)
			}
			key.FieldContext = origContext
		} else {
            cond, err := t.conditionBuilder.ConditionFor(ctx, key, qbtypes.FilterOperatorContains, fieldValueSelector.Value, sb, 0, 0)
			if err == nil {
				conds = append(conds, cond)
			}
		}

		if len(conds) != 0 {
			// see `expr` in condition_builder.go, if key doesn't exist we don't check for value
			// hence, this is join of conditions on resource and attributes
			sb.Where(sb.And(conds...))
		}
	}

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}
	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "query for related values", "query", query, "args", args)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, ErrFailedToGetRelatedValues
	}
	defer rows.Close()

	var attributeValues []string
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, false, ErrFailedToGetRelatedValues
		}
		if value != "" {
			attributeValues = append(attributeValues, value)
		}
	}

	// hit the limit?
	complete := rowCount <= limit

	return attributeValues, complete, nil
}

func (t *telemetryMetaStore) GetRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {
	return t.getRelatedValues(ctx, fieldValueSelector)
}

func (t *telemetryMetaStore) getSpanFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.tracesDBName + "." + t.tracesFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("tag_key", fieldValueSelector.Name))
	}

	// now look at the field context
	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", fieldValueSelector.FieldContext.TagType()))
	}

	// now look at the field data type
	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.Where(sb.E("tag_data_type", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeString {
			sb.Where(sb.ILike("string_value", "%"+escapeForLike(fieldValueSelector.Value)+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeNumber {
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.ILike("toString(number_value)", "%"+escapeForLike(fieldValueSelector.Value)+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
			// or b/w string and number
			sb.Where(sb.Or(
				sb.ILike("string_value", "%"+escapeForLike(fieldValueSelector.Value)+"%"),
				sb.ILike("toString(number_value)", "%"+escapeForLike(fieldValueSelector.Value)+"%"),
			))
		}
	}

	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	rowCount := 0
	totalCount := 0 // Track total unique values

	for rows.Next() {
		rowCount++

		var stringValue string
		var numberValue float64
		if err := rows.Scan(&stringValue, &numberValue); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}

		// Only add values if we haven't hit the limit yet
		if totalCount < limit {
			if _, ok := seen[stringValue]; !ok && stringValue != "" {
				values.StringValues = append(values.StringValues, stringValue)
				seen[stringValue] = true
				totalCount++
			}
			if _, ok := seen[fmt.Sprintf("%f", numberValue)]; !ok && numberValue != 0 && totalCount < limit {
				values.NumberValues = append(values.NumberValues, numberValue)
				seen[fmt.Sprintf("%f", numberValue)] = true
				totalCount++
			}
		}
	}

	// hit the limit?
	complete := rowCount <= limit

	return values, complete, nil
}

func (t *telemetryMetaStore) getLogFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.logsDBName + "." + t.logsFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("tag_key", fieldValueSelector.Name))
	}

	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", fieldValueSelector.FieldContext.TagType()))
	}

	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.Where(sb.E("tag_data_type", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeString {
			sb.Where(sb.ILike("string_value", "%"+escapeForLike(fieldValueSelector.Value)+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeNumber {
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.ILike("toString(number_value)", "%"+escapeForLike(fieldValueSelector.Value)+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
			// or b/w string and number
			sb.Where(sb.Or(
				sb.ILike("string_value", "%"+escapeForLike(fieldValueSelector.Value)+"%"),
				sb.ILike("toString(number_value)", "%"+escapeForLike(fieldValueSelector.Value)+"%"),
			))
		}
	}

	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	rowCount := 0
	totalCount := 0 // Track total unique values

	for rows.Next() {
		rowCount++

		var stringValue string
		var numberValue float64
		if err := rows.Scan(&stringValue, &numberValue); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}

		// Only add values if we haven't hit the limit yet
		if totalCount < limit {
			if _, ok := seen[stringValue]; !ok && stringValue != "" {
				values.StringValues = append(values.StringValues, stringValue)
				seen[stringValue] = true
				totalCount++
			}
			if _, ok := seen[fmt.Sprintf("%f", numberValue)]; !ok && numberValue != 0 && totalCount < limit {
				values.NumberValues = append(values.NumberValues, numberValue)
				seen[fmt.Sprintf("%f", numberValue)] = true
				totalCount++
			}
		}
	}

	// hit the limit?
	complete := rowCount <= limit

	return values, complete, nil
}

// getMetricFieldValues returns field values and whether the result is complete
func (t *telemetryMetaStore) getMetricFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	sb := sqlbuilder.
		Select("DISTINCT attr_string_value").
		From(t.metricsDBName + "." + t.metricsFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("attr_name", fieldValueSelector.Name))
	}

	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("attr_type", fieldValueSelector.FieldContext.TagType()))
	}

	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.Where(sb.E("attr_datatype", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.MetricContext != nil {
		sb.Where(sb.E("metric_name", fieldValueSelector.MetricContext.MetricName))
	}

	if fieldValueSelector.StartUnixMilli > 0 {
		sb.Where(sb.GE("last_reported_unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli > 0 {
		sb.Where(sb.LE("first_reported_unix_milli", fieldValueSelector.EndUnixMilli))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			sb.Where(sb.E("attr_string_value", fieldValueSelector.Value))
		} else {
			sb.Where(sb.ILike("attr_string_value", "%"+escapeForLike(fieldValueSelector.Value)+"%"))
		}
	}

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}
	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var stringValue string
		if err := rows.Scan(&stringValue); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		values.StringValues = append(values.StringValues, stringValue)
	}

	// hit the limit?
	complete := rowCount <= limit

	return values, complete, nil
}

func (t *telemetryMetaStore) getMeterSourceMetricFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	sb := sqlbuilder.Select("DISTINCT arrayJoin(JSONExtractKeysAndValues(labels, 'String')) AS attr").
		From(t.meterDBName + "." + t.meterFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("attr.1", fieldValueSelector.Name))
	}
	sb.Where(sb.NotLike("attr.1", "\\_\\_%"))

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			sb.Where(sb.E("attr.2", fieldValueSelector.Value))
		} else {
			sb.Where(sb.Like("attr.2", "%"+fieldValueSelector.Value+"%"))
		}
	}
	sb.Where(sb.NE("attr.2", ""))

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}
	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterValues.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var attribute []string
		if err := rows.Scan(&attribute); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterValues.Error())
		}
		if len(attribute) > 1 {
			values.StringValues = append(values.StringValues, attribute[1])
		}
	}

	// hit the limit?
	complete := rowCount <= limit
	return values, complete, nil
}

func populateAllUnspecifiedValues(allUnspecifiedValues *telemetrytypes.TelemetryFieldValues, mapOfValues map[any]bool, mapOfRelatedValues map[any]bool, values *telemetrytypes.TelemetryFieldValues, limit int) bool {
	complete := true
	totalCount := len(mapOfValues) + len(mapOfRelatedValues)

	for _, value := range values.StringValues {
		if totalCount >= limit {
			complete = false
			break
		}
		if _, ok := mapOfValues[value]; !ok {
			mapOfValues[value] = true
			allUnspecifiedValues.StringValues = append(allUnspecifiedValues.StringValues, value)
			totalCount++
		}
	}

	for _, value := range values.NumberValues {
		if totalCount >= limit {
			complete = false
			break
		}
		if _, ok := mapOfValues[value]; !ok {
			mapOfValues[value] = true
			allUnspecifiedValues.NumberValues = append(allUnspecifiedValues.NumberValues, value)
			totalCount++
		}
	}

	for _, value := range values.RelatedValues {
		if totalCount >= limit {
			complete = false
			break
		}
		if _, ok := mapOfRelatedValues[value]; !ok {
			mapOfRelatedValues[value] = true
			allUnspecifiedValues.RelatedValues = append(allUnspecifiedValues.RelatedValues, value)
			totalCount++
		}
	}

	return complete
}

// GetAllValues returns all values and whether the result is complete
func (t *telemetryMetaStore) GetAllValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	values := &telemetrytypes.TelemetryFieldValues{}
	var complete bool = true
	var err error

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	switch fieldValueSelector.Signal {
	case telemetrytypes.SignalTraces:
		values, complete, err = t.getSpanFieldValues(ctx, fieldValueSelector)
	case telemetrytypes.SignalLogs:
		values, complete, err = t.getLogFieldValues(ctx, fieldValueSelector)
	case telemetrytypes.SignalMetrics:
		if fieldValueSelector.Source == telemetrytypes.SourceMeter {
			values, complete, err = t.getMeterSourceMetricFieldValues(ctx, fieldValueSelector)
		} else {
			values, complete, err = t.getMetricFieldValues(ctx, fieldValueSelector)
		}
	case telemetrytypes.SignalUnspecified:
		mapOfValues := make(map[any]bool)
		mapOfRelatedValues := make(map[any]bool)
		allUnspecifiedValues := &telemetrytypes.TelemetryFieldValues{}

		tracesValues, tracesComplete, err := t.getSpanFieldValues(ctx, fieldValueSelector)
		if err == nil {
			populateComplete := populateAllUnspecifiedValues(allUnspecifiedValues, mapOfValues, mapOfRelatedValues, tracesValues, limit)
			complete = complete && tracesComplete && populateComplete
		}

		logsValues, logsComplete, err := t.getLogFieldValues(ctx, fieldValueSelector)
		if err == nil {
			populateComplete := populateAllUnspecifiedValues(allUnspecifiedValues, mapOfValues, mapOfRelatedValues, logsValues, limit)
			complete = complete && logsComplete && populateComplete
		}

		metricsValues, metricsComplete, err := t.getMetricFieldValues(ctx, fieldValueSelector)
		if err == nil {
			populateComplete := populateAllUnspecifiedValues(allUnspecifiedValues, mapOfValues, mapOfRelatedValues, metricsValues, limit)
			complete = complete && metricsComplete && populateComplete
		}

		values = allUnspecifiedValues
	}

	if err != nil {
		return nil, false, err
	}
	return values, complete, nil
}

func (t *telemetryMetaStore) FetchTemporality(ctx context.Context, metricName string) (metrictypes.Temporality, error) {
	if metricName == "" {
		return metrictypes.Unknown, errors.Newf(errors.TypeInternal, errors.CodeInternal, "metric name cannot be empty")
	}

	temporalityMap, err := t.FetchTemporalityMulti(ctx, metricName)
	if err != nil {
		return metrictypes.Unknown, err
	}

	temporality, ok := temporalityMap[metricName]
	if !ok {
		return metrictypes.Unknown, nil
	}

	return temporality, nil
}

func (t *telemetryMetaStore) FetchTemporalityMulti(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, error) {
	if len(metricNames) == 0 {
		return make(map[string]metrictypes.Temporality), nil
	}

	result := make(map[string]metrictypes.Temporality)
	metricsTemporality, err := t.fetchMetricsTemporality(ctx, metricNames...)
	if err != nil {
		return nil, err
	}
	// TODO: return error after table migration are run
	meterMetricsTemporality, _ := t.fetchMeterSourceMetricsTemporality(ctx, metricNames...)

	// For metrics not found in the database, set to Unknown
	for _, metricName := range metricNames {
		if temporality, exists := metricsTemporality[metricName]; exists {
			result[metricName] = temporality
			continue
		}
		if temporality, exists := meterMetricsTemporality[metricName]; exists {
			result[metricName] = temporality
			continue
		}
		result[metricName] = metrictypes.Unknown
	}

	return result, nil
}

func (t *telemetryMetaStore) fetchMetricsTemporality(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, error) {
	result := make(map[string]metrictypes.Temporality)

	// Build query to fetch temporality for all metrics
	// We use attr_string_value where attr_name = '__temporality__'
	// Note: The columns are mixed in the current data - temporality column contains metric_name
	// and metric_name column contains temporality value, so we use the correct mapping
	sb := sqlbuilder.Select(
		"metric_name",
		"argMax(temporality, last_reported_unix_milli) as temporality",
	).From(t.metricsDBName + "." + t.metricsFieldsTblName)

	// Filter by metric names (in the temporality column due to data mix-up)
	sb.Where(sb.In("metric_name", metricNames))

	// Group by metric name to get one temporality per metric
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "fetching metric temporality", "query", query, "args", args)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch metric temporality")
	}
	defer rows.Close()

	// Process results
	for rows.Next() {
		var metricName, temporalityStr string
		if err := rows.Scan(&metricName, &temporalityStr); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan temporality result")
		}

		// Convert string to Temporality type
		var temporality metrictypes.Temporality
		switch temporalityStr {
		case "Delta":
			temporality = metrictypes.Delta
		case "Cumulative":
			temporality = metrictypes.Cumulative
		case "Unspecified":
			temporality = metrictypes.Unspecified
		default:
			// Unknown or empty temporality
			temporality = metrictypes.Unknown
		}

		result[metricName] = temporality
	}

	return result, nil
}

func (t *telemetryMetaStore) fetchMeterSourceMetricsTemporality(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, error) {
	result := make(map[string]metrictypes.Temporality)

	sb := sqlbuilder.Select(
		"metric_name",
		"argMax(temporality, unix_milli) as temporality",
	).From(t.meterDBName + "." + t.meterFieldsTblName)

	// Filter by metric names (in the temporality column due to data mix-up)
	sb.Where(sb.In("metric_name", metricNames))

	// Group by metric name to get one temporality per metric
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "fetching meter metrics temporality", "query", query, "args", args)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch meter metric temporality")
	}
	defer rows.Close()

	// Process results
	for rows.Next() {
		var metricName, temporalityStr string
		if err := rows.Scan(&metricName, &temporalityStr); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan temporality result")
		}

		// Convert string to Temporality type
		var temporality metrictypes.Temporality
		switch temporalityStr {
		case "Delta":
			temporality = metrictypes.Delta
		case "Cumulative":
			temporality = metrictypes.Cumulative
		case "Unspecified":
			temporality = metrictypes.Unspecified
		default:
			// Unknown or empty temporality
			temporality = metrictypes.Unknown
		}

		result[metricName] = temporality
	}

	return result, nil
}
