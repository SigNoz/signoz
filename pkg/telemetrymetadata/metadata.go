package telemetrymetadata

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
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

	// build the query to get the keys from the spans that match the field selection criteria
	args := []any{}
	var whereClause string
	var limit int

	for idx, fieldKeySelector := range fieldKeySelectors {
		// key part of the selector
		if fieldKeySelector.SelectorType == types.FieldKeySelectorTypeExact {
			whereClause += "tag_key = ?"
			args = append(args, fieldKeySelector.Name)
		} else {
			whereClause += "tag_key ILIKE ?"
			args = append(args, fmt.Sprintf("%%%s%%", fieldKeySelector.Name))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != types.FieldContextUnspecified {
			whereClause += " AND tag_type = ?"
			args = append(args, types.FieldContextToTagType(fieldKeySelector.FieldContext))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != types.FieldDataTypeUnspecified {
			whereClause += " AND tag_data_type = ?"
			args = append(args, types.FieldDataTypeToTagDataType(fieldKeySelector.FieldDataType))
		}

		if idx != len(fieldKeySelectors)-1 {
			whereClause += " OR "
		}
		limit += fieldKeySelector.Limit
	}

	if limit == 0 {
		limit = 1000
	}

	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT
			tag_key, tag_type, tag_data_type, max(priority) as priority
		FROM (
			SELECT
				tag_key, tag_type, tag_data_type,
				CASE
					WHEN tag_type = 'spanfield' THEN 1
					WHEN tag_type = 'resource' THEN 2
					WHEN tag_type = 'scope' THEN 3
					WHEN tag_type = 'tag' THEN 4
					ELSE 5
				END as priority
			FROM %s.%s
			WHERE `+whereClause+`
		)
		GROUP BY tag_key, tag_type, tag_data_type
		ORDER BY priority
		LIMIT ?`,
		t.tracesDBName,
		t.tracesFieldsTblName,
	)

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

	// build the query to get the keys from the spans that match the field selection criteria
	args := []any{}
	var whereClause string
	var limit int

	for idx, fieldKeySelector := range fieldKeySelectors {
		if fieldKeySelector.SelectorType == types.FieldKeySelectorTypeExact {
			whereClause += "tag_key = ?"
			args = append(args, fieldKeySelector.Name)
		} else {
			whereClause += "tag_key ILIKE ?"
			args = append(args, fmt.Sprintf("%%%s%%", fieldKeySelector.Name))
		}

		// now look at the field context
		if fieldKeySelector.FieldContext != types.FieldContextUnspecified {
			whereClause += " AND tag_type = ?"
			args = append(args, types.FieldContextToTagType(fieldKeySelector.FieldContext))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != types.FieldDataTypeUnspecified {
			whereClause += " AND tag_data_type = ?"
			args = append(args, types.FieldDataTypeToTagDataType(fieldKeySelector.FieldDataType))
		}

		if idx != len(fieldKeySelectors)-1 {
			whereClause += " OR "
		}
		limit += fieldKeySelector.Limit
	}
	if limit == 0 {
		limit = 1000
	}
	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT
			tag_key, tag_type, tag_data_type, max(priority) as priority
		FROM (
			SELECT
				tag_key, tag_type, tag_data_type,
				CASE
					WHEN tag_type = 'spanfield' THEN 1
					WHEN tag_type = 'resource' THEN 2
					WHEN tag_type = 'scope' THEN 3
					WHEN tag_type = 'tag' THEN 4
					ELSE 5
				END as priority
			FROM %s.%s
			WHERE `+whereClause+`
		)
		GROUP BY tag_key, tag_type, tag_data_type
		ORDER BY priority
		LIMIT ?`,
		t.logsDBName,
		t.logsFieldsTblName,
	)

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
		if fieldKeySelector.SelectorType == types.FieldKeySelectorTypeExact {
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

func (t *telemetryMetaStore) getRelatedValues(ctx context.Context, fieldKeySelector types.FieldKeySelector, existingSelections []types.ExistingFieldSelection) (any, error) {

	args := []any{}

	var andConditions []string

	andConditions = append(andConditions, `unix_milli >= ?`)
	args = append(args, fieldKeySelector.StartUnixMilli)

	andConditions = append(andConditions, `unix_milli <= ?`)
	args = append(args, fieldKeySelector.EndUnixMilli)

	if len(existingSelections) != 0 {
		for _, item := range existingSelections {
			// we only support string for related values
			if item.Key.FieldDataType != types.FieldDataTypeString {
				continue
			}

			var colName string
			switch item.Key.FieldContext {
			case types.FieldContextResource:
				colName = "resource_attributes"
			case types.FieldContextAttribute:
				colName = "attributes"
			default:
				// we only support resource and tag for related values as of now
				continue
			}

			addCondition := func(val any) {
				andConditions = append(andConditions, fmt.Sprintf("mapContains(%s, ?)", colName))
				args = append(args, item.Key.Name)
				andConditions = append(andConditions, fmt.Sprintf("%s['%s'] = ?", colName, item.Key.Name))
				args = append(args, val)
			}
			switch v := item.Value.(type) {
			case string:
				addCondition(v)
			case []string:
				for _, val := range v {
					addCondition(val)
				}
			case []interface{}:
				for _, val := range v {
					addCondition(val)
				}
			}
		}
	}
	whereClause := strings.Join(andConditions, " AND ")

	var selectColumn string
	switch fieldKeySelector.FieldContext {
	case types.FieldContextResource:
		selectColumn = "resource_attributes" + "['" + fieldKeySelector.Name + "']"
	case types.FieldContextAttribute:
		selectColumn = "attributes" + "['" + fieldKeySelector.Name + "']"
	default:
		selectColumn = "attributes" + "['" + fieldKeySelector.Name + "']"
	}

	args = append(args, fieldKeySelector.Limit)
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

func (t *telemetryMetaStore) GetRelatedValues(ctx context.Context, fieldKeySelector types.FieldKeySelector, existingSelections []types.ExistingFieldSelection) (any, error) {
	return t.getRelatedValues(ctx, fieldKeySelector, existingSelections)
}

func (t *telemetryMetaStore) getSpanFieldValues(_ context.Context) (any, error) {
	return nil, nil
}

func (t *telemetryMetaStore) getLogFieldValues(_ context.Context) (any, error) {
	return nil, nil
}

func (t *telemetryMetaStore) getMetricFieldValues(_ context.Context) (any, error) {
	return nil, nil
}

func (t *telemetryMetaStore) GetAllValues(ctx context.Context, fieldKeySelector types.FieldKeySelector) (any, error) {
	var values any
	var err error
	switch fieldKeySelector.FieldContext {
	case types.FieldContextSpan:
		values, err = t.getSpanFieldValues(ctx)
	case types.FieldContextLog:
		values, err = t.getLogFieldValues(ctx)
	case types.FieldContextMetric:
		values, err = t.getMetricFieldValues(ctx)
	}
	if err != nil {
		return nil, err
	}
	return values, nil
}
