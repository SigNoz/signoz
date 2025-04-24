package telemetrymetadata

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	parser "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"go.uber.org/zap"
)

var (
	ErrFailedToGetTracesKeys    = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get traces keys")
	ErrFailedToGetLogsKeys      = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get logs keys")
	ErrFailedToGetTblStatement  = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get tbl statement")
	ErrFailedToGetMetricsKeys   = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get metrics keys")
	ErrFailedToGetRelatedValues = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get related values")
)

type telemetryMetaStore struct {
	telemetrystore         telemetrystore.TelemetryStore
	tracesDBName           string
	tracesFieldsTblName    string
	indexV3TblName         string
	metricsDBName          string
	metricsFieldsTblName   string
	logsDBName             string
	logsFieldsTblName      string
	logsV2TblName          string
	relatedMetadataDBName  string
	relatedMetadataTblName string

	conditionBuilder qbtypes.ConditionBuilder
}

func NewTelemetryMetaStore(
	telemetrystore telemetrystore.TelemetryStore,
	tracesDBName string,
	tracesFieldsTblName string,
	indexV3TblName string,
	metricsDBName string,
	metricsFieldsTblName string,
	logsDBName string,
	logsV2TblName string,
	logsFieldsTblName string,
	relatedMetadataDBName string,
	relatedMetadataTblName string,
) telemetrytypes.MetadataStore {
	return &telemetryMetaStore{

		telemetrystore:         telemetrystore,
		tracesDBName:           tracesDBName,
		tracesFieldsTblName:    tracesFieldsTblName,
		indexV3TblName:         indexV3TblName,
		metricsDBName:          metricsDBName,
		metricsFieldsTblName:   metricsFieldsTblName,
		logsDBName:             logsDBName,
		logsV2TblName:          logsV2TblName,
		logsFieldsTblName:      logsFieldsTblName,
		relatedMetadataDBName:  relatedMetadataDBName,
		relatedMetadataTblName: relatedMetadataTblName,

		conditionBuilder: NewConditionBuilder(),
	}
}

// tracesTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the traces table
func (t *telemetryMetaStore) tracesTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.tracesDBName, t.indexV3TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalTraces
	}

	return materialisedKeys, nil
}

// getTracesKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getTracesKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {

	if len(fieldKeySelectors) == 0 {
		return nil, nil
	}

	// pre-fetch the materialised keys from the traces table
	matKeys, err := t.tracesTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	sb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", `
			CASE
				WHEN tag_type = 'spanfield' THEN 1
				WHEN tag_type = 'resource' THEN 2
				WHEN tag_type = 'scope' THEN 3
				WHEN tag_type = 'tag' THEN 4
				ELSE 5
			END as priority`).From(t.tracesDBName + "." + t.tracesFieldsTblName)
	var limit int

	conds := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {

		if fieldKeySelector.StartUnixMilli != 0 {
			conds = append(conds, sb.GE("unix_milli", fieldKeySelector.StartUnixMilli))
		}
		if fieldKeySelector.EndUnixMilli != 0 {
			conds = append(conds, sb.LE("unix_milli", fieldKeySelector.EndUnixMilli))
		}

		// key part of the selector
		fieldKeyConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_key", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.Like("tag_key", "%"+fieldKeySelector.Name+"%"))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_type", fieldKeySelector.FieldContext.TagType()))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_data_type", fieldKeySelector.FieldDataType.TagDataType()))
		}

		conds = append(conds, sb.And(fieldKeyConds...))
		limit += fieldKeySelector.Limit
	}
	sb.Where(sb.Or(conds...))

	if limit == 0 {
		limit = 1000
	}

	mainSb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("tag_key", "tag_type", "tag_data_type")
	mainSb.OrderBy("priority")
	mainSb.Limit(limit)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}
	defer rows.Close()
	keys := []*telemetrytypes.TelemetryFieldKey{}
	for rows.Next() {
		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
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
	}

	if rows.Err() != nil {
		return nil, errors.Wrapf(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	return keys, nil
}

// logsTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the logs table
func (t *telemetryMetaStore) logsTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.logsDBName, t.logsV2TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalLogs
	}

	return materialisedKeys, nil
}

// getLogsKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getLogsKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, nil
	}

	// pre-fetch the materialised keys from the logs table
	matKeys, err := t.logsTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	sb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", `
			CASE
				WHEN tag_type = 'logfield' THEN 1
				WHEN tag_type = 'resource' THEN 2
				WHEN tag_type = 'scope' THEN 3
				WHEN tag_type = 'tag' THEN 4
				ELSE 5
			END as priority`).From(t.logsDBName + "." + t.logsFieldsTblName)
	var limit int

	conds := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {

		if fieldKeySelector.StartUnixMilli != 0 {
			conds = append(conds, sb.GE("unix_milli", fieldKeySelector.StartUnixMilli))
		}
		if fieldKeySelector.EndUnixMilli != 0 {
			conds = append(conds, sb.LE("unix_milli", fieldKeySelector.EndUnixMilli))
		}

		// key part of the selector
		fieldKeyConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_key", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.Like("tag_key", "%"+fieldKeySelector.Name+"%"))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_type", fieldKeySelector.FieldContext.TagType()))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_data_type", fieldKeySelector.FieldDataType.TagDataType()))
		}

		conds = append(conds, sb.And(fieldKeyConds...))
		limit += fieldKeySelector.Limit
	}
	sb.Where(sb.Or(conds...))
	if limit == 0 {
		limit = 1000
	}

	mainSb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("tag_key", "tag_type", "tag_data_type")
	mainSb.OrderBy("priority")
	mainSb.Limit(limit)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()
	keys := []*telemetrytypes.TelemetryFieldKey{}
	for rows.Next() {
		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
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
	}

	if rows.Err() != nil {
		return nil, errors.Wrapf(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}

	return keys, nil
}

// getMetricsKeys returns the keys from the metrics that match the field selection criteria
func (t *telemetryMetaStore) getMetricsKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, nil
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
			fieldConds = append(fieldConds, sb.Like("attr_name", "%"+fieldKeySelector.Name+"%"))
		}

		if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified {
			fieldConds = append(fieldConds, sb.E("attr_type", fieldKeySelector.FieldContext.TagType()))
		}

		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			fieldConds = append(fieldConds, sb.E("attr_datatype", fieldKeySelector.FieldDataType.TagDataType()))
		}

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

	mainSb := sqlbuilder.Select("name", "field_context", "field_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("name", "field_context", "field_data_type")
	mainSb.OrderBy("priority")
	mainSb.Limit(limit)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	keys := []*telemetrytypes.TelemetryFieldKey{}
	for rows.Next() {
		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  fieldContext,
			FieldDataType: fieldDataType,
		})
	}

	if rows.Err() != nil {
		return nil, errors.Wrapf(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}

	return keys, nil
}

func (t *telemetryMetaStore) GetKeys(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	var err error
	switch fieldKeySelector.Signal {
	case telemetrytypes.SignalTraces:
		keys, err = t.getTracesKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
	case telemetrytypes.SignalLogs:
		keys, err = t.getLogsKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
	case telemetrytypes.SignalMetrics:
		keys, err = t.getMetricsKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
	case telemetrytypes.SignalUnspecified:
		// get traces keys
		tracesKeys, err := t.getTracesKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, tracesKeys...)

		// get logs keys
		logsKeys, err := t.getLogsKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, logsKeys...)

		// get metrics keys
		metricsKeys, err := t.getMetricsKeys(ctx, []*telemetrytypes.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, metricsKeys...)
	}
	if err != nil {
		return nil, err
	}

	mapOfKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
	for _, key := range keys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}

	return mapOfKeys, nil
}

func (t *telemetryMetaStore) GetKeysMulti(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {

	logsSelectors := []*telemetrytypes.FieldKeySelector{}
	tracesSelectors := []*telemetrytypes.FieldKeySelector{}
	metricsSelectors := []*telemetrytypes.FieldKeySelector{}

	for _, fieldKeySelector := range fieldKeySelectors {
		switch fieldKeySelector.Signal {
		case telemetrytypes.SignalLogs:
			logsSelectors = append(logsSelectors, fieldKeySelector)
		case telemetrytypes.SignalTraces:
			tracesSelectors = append(tracesSelectors, fieldKeySelector)
		case telemetrytypes.SignalMetrics:
			metricsSelectors = append(metricsSelectors, fieldKeySelector)
		case telemetrytypes.SignalUnspecified:
			logsSelectors = append(logsSelectors, fieldKeySelector)
			tracesSelectors = append(tracesSelectors, fieldKeySelector)
			metricsSelectors = append(metricsSelectors, fieldKeySelector)
		}
	}

	logsKeys, err := t.getLogsKeys(ctx, logsSelectors)
	if err != nil {
		return nil, err
	}
	tracesKeys, err := t.getTracesKeys(ctx, tracesSelectors)
	if err != nil {
		return nil, err
	}
	metricsKeys, err := t.getMetricsKeys(ctx, metricsSelectors)
	if err != nil {
		return nil, err
	}

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

	return mapOfKeys, nil
}

func (t *telemetryMetaStore) GetKey(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	keys, err := t.GetKeys(ctx, fieldKeySelector)
	if err != nil {
		return nil, err
	}
	return keys[fieldKeySelector.Name], nil
}

func (t *telemetryMetaStore) getRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, error) {

	// nothing to return as "related" value if there is nothing to filter on
	if fieldValueSelector.ExistingQuery == "" {
		return nil, nil
	}

	key := telemetrytypes.TelemetryFieldKey{
		Name:          fieldValueSelector.Name,
		Signal:        fieldValueSelector.Signal,
		FieldContext:  fieldValueSelector.FieldContext,
		FieldDataType: fieldValueSelector.FieldDataType,
	}

	selectColumn, err := t.conditionBuilder.GetTableFieldName(ctx, &key)

	if err != nil {
		// we don't have a explicit column to select from the related metadata table
		// so we will select either from resource_attributes or attributes table
		// in that order
		resourceColumn, _ := t.conditionBuilder.GetTableFieldName(ctx, &telemetrytypes.TelemetryFieldKey{
			Name:          key.Name,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		attributeColumn, _ := t.conditionBuilder.GetTableFieldName(ctx, &telemetrytypes.TelemetryFieldKey{
			Name:          key.Name,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		selectColumn = fmt.Sprintf("if(notEmpty(%s), %s, %s)", resourceColumn, resourceColumn, attributeColumn)
	}

	sb := sqlbuilder.Select("DISTINCT " + selectColumn).From(t.relatedMetadataDBName + "." + t.relatedMetadataTblName)

	if len(fieldValueSelector.ExistingQuery) != 0 {
		keysSelectors, err := parser.QueryStringToKeysSelectors(fieldValueSelector.ExistingQuery)

		if err == nil {
			for idx := range keysSelectors {
				keysSelectors[idx].Signal = fieldValueSelector.Signal
			}
			keys, err := t.GetKeysMulti(ctx, keysSelectors)
			if err == nil {
				whereClause, _, err := parser.PrepareWhereClause(fieldValueSelector.ExistingQuery, keys, t.conditionBuilder, &telemetrytypes.TelemetryFieldKey{})
				if err == nil {
					sb.AddWhereClause(whereClause)
				} else {
					zap.L().Warn("error parsing existing query for related values", zap.Error(err))
				}
			}
		}
	}

	if fieldValueSelector.StartUnixMilli != 0 {
		sb.Where(sb.GE("unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli != 0 {
		sb.Where(sb.LE("unix_milli", fieldValueSelector.EndUnixMilli))
	}

	if fieldValueSelector.Limit != 0 {
		sb.Limit(fieldValueSelector.Limit)
	} else {
		sb.Limit(50)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	zap.L().Debug("query for related values", zap.String("query", query), zap.Any("args", args))

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, ErrFailedToGetRelatedValues
	}
	defer rows.Close()

	var attributeValues []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, ErrFailedToGetRelatedValues
		}
		if value != "" {
			attributeValues = append(attributeValues, value)
		}
	}

	return attributeValues, nil
}

func (t *telemetryMetaStore) GetRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, error) {
	return t.getRelatedValues(ctx, fieldValueSelector)
}

func (t *telemetryMetaStore) getSpanFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	var limit int

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
			sb.Where(sb.Like("string_value", "%"+fieldValueSelector.Value+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeNumber {
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.Like("toString(number_value)", "%"+fieldValueSelector.Value+"%"))
		}
	}

	if limit == 0 {
		limit = 50
	}
	sb.Limit(limit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	for rows.Next() {
		var stringValue string
		var numberValue float64
		if err := rows.Scan(&stringValue, &numberValue); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
		if _, ok := seen[stringValue]; !ok {
			values.StringValues = append(values.StringValues, stringValue)
			seen[stringValue] = true
		}
		if _, ok := seen[fmt.Sprintf("%f", numberValue)]; !ok && numberValue != 0 {
			values.NumberValues = append(values.NumberValues, numberValue)
			seen[fmt.Sprintf("%f", numberValue)] = true
		}
	}

	return values, nil
}

func (t *telemetryMetaStore) getLogFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	var limit int

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
			sb.Where(sb.Like("string_value", "%"+fieldValueSelector.Value+"%"))
		} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeNumber {
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.Like("toString(number_value)", "%"+fieldValueSelector.Value+"%"))
		}
	}

	if limit == 0 {
		limit = 50
	}
	sb.Limit(limit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	for rows.Next() {
		var stringValue string
		var numberValue float64
		if err := rows.Scan(&stringValue, &numberValue); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
		if _, ok := seen[stringValue]; !ok {
			values.StringValues = append(values.StringValues, stringValue)
			seen[stringValue] = true
		}
		if _, ok := seen[fmt.Sprintf("%f", numberValue)]; !ok && numberValue != 0 {
			values.NumberValues = append(values.NumberValues, numberValue)
			seen[fmt.Sprintf("%f", numberValue)] = true
		}
	}
	return values, nil
}

func (t *telemetryMetaStore) getMetricFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, error) {
	sb := sqlbuilder.
		Select("DISTINCT attr_string_value").
		From(t.metricsDBName + "." + t.metricsFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("attr_name", fieldValueSelector.Name))
	}

	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.And(sb.E("attr_type", fieldValueSelector.FieldContext.TagType()))
	}

	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.And(sb.E("attr_datatype", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.MetricContext != nil {
		sb.And(sb.E("metric_name", fieldValueSelector.MetricContext.MetricName))
	}

	if fieldValueSelector.StartUnixMilli > 0 {
		sb.And(sb.GE("last_reported_unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli > 0 {
		sb.And(sb.LE("first_reported_unix_milli", fieldValueSelector.EndUnixMilli))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			sb.And(sb.E("attr_string_value", fieldValueSelector.Value))
		} else {
			sb.And(sb.Like("attr_string_value", "%"+fieldValueSelector.Value+"%"))
		}
	}

	if fieldValueSelector.Limit > 0 {
		sb.Limit(fieldValueSelector.Limit)
	} else {
		sb.Limit(50)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	for rows.Next() {
		var stringValue string
		if err := rows.Scan(&stringValue); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		values.StringValues = append(values.StringValues, stringValue)
	}
	return values, nil
}

func (t *telemetryMetaStore) GetAllValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, error) {
	var values *telemetrytypes.TelemetryFieldValues
	var err error
	switch fieldValueSelector.Signal {
	case telemetrytypes.SignalTraces:
		values, err = t.getSpanFieldValues(ctx, fieldValueSelector)
	case telemetrytypes.SignalLogs:
		values, err = t.getLogFieldValues(ctx, fieldValueSelector)
	case telemetrytypes.SignalMetrics:
		values, err = t.getMetricFieldValues(ctx, fieldValueSelector)
	}
	if err != nil {
		return nil, err
	}
	return values, nil
}
