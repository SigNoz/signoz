package telemetrymetadata

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
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
	timeseries1WTblName    string
	logsDBName             string
	logsFieldsTblName      string
	logsV2TblName          string
	relatedMetadataDBName  string
	relatedMetadataTblName string

	conditionBuilder types.ConditionBuilder
}

func NewTelemetryMetaStore(
	telemetrystore telemetrystore.TelemetryStore,
	tracesDBName string,
	tracesFieldsTblName string,
	indexV3TblName string,
	metricsDBName string,
	metricsFieldsTblName string,
	timeseries1WTblName string,
	logsDBName string,
	logsV2TblName string,
	logsFieldsTblName string,
	relatedMetadataDBName string,
	relatedMetadataTblName string,
) (types.Metadata, error) {
	return &telemetryMetaStore{
		telemetrystore:         telemetrystore,
		tracesDBName:           tracesDBName,
		tracesFieldsTblName:    tracesFieldsTblName,
		indexV3TblName:         indexV3TblName,
		metricsDBName:          metricsDBName,
		metricsFieldsTblName:   metricsFieldsTblName,
		timeseries1WTblName:    timeseries1WTblName,
		logsDBName:             logsDBName,
		logsV2TblName:          logsV2TblName,
		logsFieldsTblName:      logsFieldsTblName,
		relatedMetadataDBName:  relatedMetadataDBName,
		relatedMetadataTblName: relatedMetadataTblName,

		conditionBuilder: NewConditionBuilder(),
	}, nil
}

// tracesTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the traces table
func (t *telemetryMetaStore) tracesTblStatementToFieldKeys(ctx context.Context) ([]types.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.tracesDBName, t.indexV3TblName)
	statements := []types.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	return ExtractFieldKeysFromTblStatement(statements[0].Statement)
}

// getTracesKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getTracesKeys(ctx context.Context, fieldKeySelectors []types.FieldKeySelector) ([]types.TelemetryFieldKey, error) {

	if len(fieldKeySelectors) == 0 {
		return nil, nil
	}

	// pre-fetch the materialised keys from the traces table
	matKeys, err := t.tracesTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, err
	}
	mapOfKeys := make(map[string]types.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.String()+";"+key.FieldDataType.String()] = key
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
		if fieldKeySelector.SelectorMatchType == types.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_key", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.Like("tag_key", "%"+fieldKeySelector.Name+"%"))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != types.FieldContextUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_type", types.FieldContextToTagType(fieldKeySelector.FieldContext)))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != types.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_data_type", types.FieldDataTypeToTagDataType(fieldKeySelector.FieldDataType)))
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
	keys := []types.TelemetryFieldKey{}
	for rows.Next() {
		var name, typ, dataType string
		var priority uint8
		err = rows.Scan(&name, &typ, &dataType, &priority)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
		}
		fieldContext := types.FieldContextFromString(typ)
		fieldDataType := types.FieldDataTypeFromString(dataType)
		key, ok := mapOfKeys[name+";"+fieldContext.String()+";"+fieldDataType.String()]

		// if there is no materialised column, create a key with the field context and data type
		if !ok {
			key = types.TelemetryFieldKey{
				Name:          name,
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
func (t *telemetryMetaStore) logsTblStatementToFieldKeys(ctx context.Context) ([]types.TelemetryFieldKey, error) {
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.logsDBName, t.logsV2TblName)
	statements := []types.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	return ExtractFieldKeysFromTblStatement(statements[0].Statement)
}

// getLogsKeys returns the keys from the spans that match the field selection criteria
func (t *telemetryMetaStore) getLogsKeys(ctx context.Context, fieldKeySelectors []types.FieldKeySelector) ([]types.TelemetryFieldKey, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, nil
	}

	// pre-fetch the materialised keys from the logs table
	matKeys, err := t.logsTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, err
	}
	mapOfKeys := make(map[string]types.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.String()+";"+key.FieldDataType.String()] = key
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
		if fieldKeySelector.SelectorMatchType == types.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_key", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.Like("tag_key", "%"+fieldKeySelector.Name+"%"))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != types.FieldContextUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_type", types.FieldContextToTagType(fieldKeySelector.FieldContext)))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != types.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("tag_data_type", types.FieldDataTypeToTagDataType(fieldKeySelector.FieldDataType)))
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
	keys := []types.TelemetryFieldKey{}
	for rows.Next() {
		var name, typ, dataType string
		var priority uint8
		err = rows.Scan(&name, &typ, &dataType, &priority)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
		fieldContext := types.FieldContextFromString(typ)
		fieldDataType := types.FieldDataTypeFromString(dataType)
		key, ok := mapOfKeys[name+";"+fieldContext.String()+";"+fieldDataType.String()]

		// if there is no materialised column, create a key with the field context and data type
		if !ok {
			key = types.TelemetryFieldKey{
				Name:          name,
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
// TODO(srikanthccv): update the implementation after the dot metrics migration is done
func (t *telemetryMetaStore) getMetricsKeys(ctx context.Context, fieldKeySelectors []types.FieldKeySelector) ([]types.TelemetryFieldKey, error) {
	if len(fieldKeySelectors) == 0 {
		return nil, nil
	}

	var whereClause, innerWhereClause string
	var limit int
	args := []any{}

	for _, fieldKeySelector := range fieldKeySelectors {
		if fieldKeySelector.MetricContext != nil {
			innerWhereClause += "metric_name IN ? AND"
			args = append(args, fieldKeySelector.MetricContext.MetricName)
		}
	}
	innerWhereClause += " __normalized = true"

	for idx, fieldKeySelector := range fieldKeySelectors {
		if fieldKeySelector.SelectorMatchType == types.FieldSelectorMatchTypeExact {
			whereClause += "(distinctTagKey = ? AND distinctTagKey NOT LIKE '\\_\\_%%')"
			args = append(args, fieldKeySelector.Name)
		} else {
			whereClause += "(distinctTagKey ILIKE ? AND distinctTagKey NOT LIKE '\\_\\_%%')"
			args = append(args, fmt.Sprintf("%%%s%%", fieldKeySelector.Name))
		}
		if idx != len(fieldKeySelectors)-1 {
			whereClause += " OR "
		}
		limit += fieldKeySelector.Limit
	}
	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT
			arrayJoin(tagKeys) AS distinctTagKey
		FROM (
			SELECT JSONExtractKeys(labels) AS tagKeys
			FROM %s.%s
			WHERE `+innerWhereClause+`
			GROUP BY tagKeys
		)
		WHERE `+whereClause+`
		GROUP BY distinctTagKey
		LIMIT ?
	`, t.metricsDBName, t.timeseries1WTblName)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	keys := []types.TelemetryFieldKey{}
	for rows.Next() {
		var name string
		err = rows.Scan(&name)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		key := types.TelemetryFieldKey{
			Name:          name,
			FieldContext:  types.FieldContextAttribute,
			FieldDataType: types.FieldDataTypeString,
		}
		keys = append(keys, key)
	}

	if rows.Err() != nil {
		return nil, errors.Wrapf(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}

	return keys, nil
}

func (t *telemetryMetaStore) GetKeys(ctx context.Context, fieldKeySelector types.FieldKeySelector) (map[string][]types.TelemetryFieldKey, error) {
	var keys []types.TelemetryFieldKey
	var err error
	switch fieldKeySelector.Signal {
	case types.SignalTraces:
		keys, err = t.getTracesKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
	case types.SignalLogs:
		keys, err = t.getLogsKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
	case types.SignalMetrics:
		keys, err = t.getMetricsKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
	case types.SignalUnspecified:
		// get traces keys
		tracesKeys, err := t.getTracesKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, tracesKeys...)

		// get logs keys
		logsKeys, err := t.getLogsKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, logsKeys...)

		// get metrics keys
		metricsKeys, err := t.getMetricsKeys(ctx, []types.FieldKeySelector{fieldKeySelector})
		if err != nil {
			return nil, err
		}
		keys = append(keys, metricsKeys...)
	}
	if err != nil {
		return nil, err
	}

	mapOfKeys := make(map[string][]types.TelemetryFieldKey)
	for _, key := range keys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}

	return mapOfKeys, nil
}

func (t *telemetryMetaStore) GetKeysMulti(ctx context.Context, fieldKeySelectors []types.FieldKeySelector) (map[string][]types.TelemetryFieldKey, error) {

	logsSelectors := []types.FieldKeySelector{}
	tracesSelectors := []types.FieldKeySelector{}
	metricsSelectors := []types.FieldKeySelector{}

	for _, fieldKeySelector := range fieldKeySelectors {
		switch fieldKeySelector.Signal {
		case types.SignalLogs:
			logsSelectors = append(logsSelectors, fieldKeySelector)
		case types.SignalTraces:
			tracesSelectors = append(tracesSelectors, fieldKeySelector)
		case types.SignalMetrics:
			metricsSelectors = append(metricsSelectors, fieldKeySelector)
		case types.SignalUnspecified:
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

	mapOfKeys := make(map[string][]types.TelemetryFieldKey)
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

func (t *telemetryMetaStore) GetKey(ctx context.Context, fieldKeySelector types.FieldKeySelector) ([]types.TelemetryFieldKey, error) {
	keys, err := t.GetKeys(ctx, fieldKeySelector)
	if err != nil {
		return nil, err
	}
	return keys[fieldKeySelector.Name], nil
}

func (t *telemetryMetaStore) getRelatedValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) ([]string, error) {

	args := []any{}

	var andConditions []string

	andConditions = append(andConditions, `unix_milli >= ?`)
	args = append(args, fieldValueSelector.StartUnixMilli)

	andConditions = append(andConditions, `unix_milli <= ?`)
	args = append(args, fieldValueSelector.EndUnixMilli)

	if len(fieldValueSelector.ExistingQuery) != 0 {
		// TODO(srikanthccv): add the existing query to the where clause
	}
	whereClause := strings.Join(andConditions, " AND ")

	key := types.TelemetryFieldKey{
		Name:          fieldValueSelector.Name,
		Signal:        fieldValueSelector.Signal,
		FieldContext:  fieldValueSelector.FieldContext,
		FieldDataType: fieldValueSelector.FieldDataType,
	}

	// TODO(srikanthccv): add the select column
	selectColumn, _ := t.conditionBuilder.GetTableFieldName(ctx, key)

	args = append(args, fieldValueSelector.Limit)
	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s LIMIT ?",
		selectColumn,
		t.relatedMetadataDBName,
		t.relatedMetadataTblName,
		whereClause,
	)
	zap.L().Debug("filterSubQuery for related values", zap.String("query", filterSubQuery), zap.Any("args", args))

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, filterSubQuery, args...)
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

func (t *telemetryMetaStore) GetRelatedValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) ([]string, error) {
	return t.getRelatedValues(ctx, fieldValueSelector)
}

func (t *telemetryMetaStore) getSpanFieldValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) (*types.TelemetryFieldValues, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	var limit int

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.tracesDBName + "." + t.tracesFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("tag_key", fieldValueSelector.Name))
	}

	// now look at the field context
	if fieldValueSelector.FieldContext != types.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", types.FieldContextToTagType(fieldValueSelector.FieldContext)))
	}

	// now look at the field data type
	if fieldValueSelector.FieldDataType != types.FieldDataTypeUnspecified {
		sb.Where(sb.E("tag_data_type", types.FieldDataTypeToTagDataType(fieldValueSelector.FieldDataType)))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.FieldDataType == types.FieldDataTypeString {
			sb.Where(sb.Like("string_value", "%"+fieldValueSelector.Value+"%"))
		} else if fieldValueSelector.FieldDataType == types.FieldDataTypeNumber {
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

	values := &types.TelemetryFieldValues{}
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

func (t *telemetryMetaStore) getLogFieldValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) (*types.TelemetryFieldValues, error) {
	// build the query to get the keys from the spans that match the field selection criteria
	var limit int

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.logsDBName + "." + t.logsFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("tag_key", fieldValueSelector.Name))
	}

	if fieldValueSelector.FieldContext != types.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", types.FieldContextToTagType(fieldValueSelector.FieldContext)))
	}

	if fieldValueSelector.FieldDataType != types.FieldDataTypeUnspecified {
		sb.Where(sb.E("tag_data_type", types.FieldDataTypeToTagDataType(fieldValueSelector.FieldDataType)))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.FieldDataType == types.FieldDataTypeString {
			sb.Where(sb.Like("string_value", "%"+fieldValueSelector.Value+"%"))
		} else if fieldValueSelector.FieldDataType == types.FieldDataTypeNumber {
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

	values := &types.TelemetryFieldValues{}
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

func (t *telemetryMetaStore) getMetricFieldValues(_ context.Context, fieldValueSelector types.FieldValueSelector) (*types.TelemetryFieldValues, error) {
	return nil, nil
}

func (t *telemetryMetaStore) GetAllValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) (*types.TelemetryFieldValues, error) {
	var values *types.TelemetryFieldValues
	var err error
	switch fieldValueSelector.Signal {
	case types.SignalTraces:
		values, err = t.getSpanFieldValues(ctx, fieldValueSelector)
	case types.SignalLogs:
		values, err = t.getLogFieldValues(ctx, fieldValueSelector)
	case types.SignalMetrics:
		values, err = t.getMetricFieldValues(ctx, fieldValueSelector)
	}
	if err != nil {
		return nil, err
	}
	return values, nil
}
