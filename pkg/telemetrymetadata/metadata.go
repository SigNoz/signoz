package telemetrymetadata

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/parser"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/resolvercore"
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrFailedToGetTracesKeys    = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get traces keys")
	ErrFailedToGetLogsKeys      = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get logs keys")
	ErrFailedToGetAuditKeys     = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get audit keys")
	ErrFailedToGetTblStatement  = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get tbl statement")
	ErrFailedToGetMetricsKeys   = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get metrics keys")
	ErrFailedToGetMeterKeys     = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get meter keys")
	ErrFailedToGetMeterValues   = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get meter values")
	ErrFailedToGetRelatedValues = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get related values")
)

type telemetryMetaStore struct {
	logger                         *slog.Logger
	telemetrystore                 telemetrystore.TelemetryStore
	tracesDBName                   string
	tracesFieldsTblName            string
	spanAttributesKeysTblName      string
	indexV3TblName                 string
	metricsDBName                  string
	metricsFieldsTblName           string
	meterDBName                    string
	meterFieldsTblName             string
	logsDBName                     string
	logsFieldsTblName              string
	logAttributeKeysTblName        string
	logResourceKeysTblName         string
	logsV2TblName                  string
	auditDBName                    string
	auditLogsTblName               string
	auditFieldsTblName             string
	auditAttributeKeysTblName      string
	auditResourceKeysTblName       string
	relatedMetadataDBName          string
	relatedMetadataTblName         string
	columnEvolutionMetadataTblName string

	storage            qbtypes.Storage
	fl                 flagger.Flagger
	jsonColumnMetadata map[telemetrytypes.Signal]map[telemetrytypes.FieldContext]telemetrytypes.JSONColumnMetadata
}

func NewTelemetryMetaStore(
	settings factory.ProviderSettings,
	telemetrystore telemetrystore.TelemetryStore,
	fl flagger.Flagger,
) telemetrytypes.MetadataStore {
	metadataSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymetadata")

	t := &telemetryMetaStore{
		logger:                         metadataSettings.Logger(),
		telemetrystore:                 telemetrystore,
		tracesDBName:                   tracestelemetryschema.DBName,
		tracesFieldsTblName:            tracestelemetryschema.TagAttributesV2TableName,
		spanAttributesKeysTblName:      tracestelemetryschema.SpanAttributesKeysTblName,
		indexV3TblName:                 tracestelemetryschema.SpanIndexV3TableName,
		metricsDBName:                  metricstelemetryschema.DBName,
		metricsFieldsTblName:           metricstelemetryschema.AttributesMetadataTableName,
		meterDBName:                    metertelemetryschema.DBName,
		meterFieldsTblName:             metertelemetryschema.SamplesAgg1dTableName,
		logsDBName:                     logstelemetryschema.DBName,
		logsV2TblName:                  logstelemetryschema.LogsV2TableName,
		logsFieldsTblName:              logstelemetryschema.TagAttributesV2TableName,
		logAttributeKeysTblName:        logstelemetryschema.LogAttributeKeysTblName,
		logResourceKeysTblName:         logstelemetryschema.LogResourceKeysTblName,
		auditDBName:                    audittelemetryschema.DBName,
		auditLogsTblName:               audittelemetryschema.AuditLogsTableName,
		auditFieldsTblName:             audittelemetryschema.TagAttributesTableName,
		auditAttributeKeysTblName:      audittelemetryschema.LogAttributeKeysTblName,
		auditResourceKeysTblName:       audittelemetryschema.LogResourceKeysTblName,
		relatedMetadataDBName:          DBName,
		relatedMetadataTblName:         AttributesMetadataTableName,
		columnEvolutionMetadataTblName: ColumnEvolutionMetadataTableName,
		jsonColumnMetadata: map[telemetrytypes.Signal]map[telemetrytypes.FieldContext]telemetrytypes.JSONColumnMetadata{
			telemetrytypes.SignalLogs: {
				telemetrytypes.FieldContextBody: telemetrytypes.JSONColumnMetadata{
					BaseColumn:     logstelemetryschema.LogsV2BodyV2Column,
					PromotedColumn: logstelemetryschema.LogsV2BodyPromotedColumn,
				},
			},
		},
		fl:      fl,
		storage: NewStorage(),
	}

	return t
}

// GetMaterializedKeys sets each key's Indexes to the skip indexes built on its column alone.
func (t *telemetryMetaStore) GetMaterializedKeys(ctx context.Context, signal telemetrytypes.Signal) ([]*telemetrytypes.TelemetryFieldKey, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	var dbName, localTableName string
	var err error
	switch signal {
	case telemetrytypes.SignalTraces:
		keys, err = t.tracesTblStatementToFieldKeys(ctx)
		dbName, localTableName = t.tracesDBName, tracestelemetryschema.SpanIndexV3LocalTableName
	case telemetrytypes.SignalLogs:
		keys, err = t.logsTblStatementToFieldKeys(ctx)
		dbName, localTableName = t.logsDBName, logstelemetryschema.LogsV2LocalTableName
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "materialized keys are not supported for signal %s", signal.StringValue())
	}
	if err != nil {
		return nil, err
	}

	indexes, err := t.listColumnSkipIndexes(ctx, signal, dbName, localTableName)
	if err != nil {
		return nil, err
	}
	for _, key := range keys {
		for _, index := range indexes[strings.Trim(telemetrytypes.FieldKeyToMaterializedColumnName(key), "`")] {
			index.Name = key.Name
			index.FieldContext = key.FieldContext
			index.FieldDataType = key.FieldDataType
			key.Indexes = append(key.Indexes, index)
		}
	}

	return keys, nil
}

// listColumnSkipIndexes keys each index by its expression with one pair of
// quoting backticks removed, so only an index on a single column matches a
// column name.
func (t *telemetryMetaStore) listColumnSkipIndexes(ctx context.Context, signal telemetrytypes.Signal, dbName, localTableName string) (map[string][]telemetrytypes.TelemetryFieldKeySkipIndex, error) {
	ctx = withTelemetryContext(ctx, signal, "listColumnSkipIndexes")
	sb := sqlbuilder.Select("name", "type_full", "expr", "granularity").From(SkipIndexTableName)
	sb.Where(sb.Equal("database", dbName), sb.Equal("table", localTableName))
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to load skip indexes of %s.%s", dbName, localTableName)
	}
	defer rows.Close()

	indexes := map[string][]telemetrytypes.TelemetryFieldKeySkipIndex{}
	for rows.Next() {
		var name, typeFull, expr string
		var granularity uint64
		if err := rows.Scan(&name, &typeFull, &expr, &granularity); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan skip index")
		}
		column := strings.TrimSuffix(strings.TrimPrefix(expr, "`"), "`")
		indexes[column] = append(indexes[column], telemetrytypes.TelemetryFieldKeySkipIndex{
			BaseColumn:      column,
			IndexName:       name,
			IndexType:       typeFull,
			IndexExpression: expr,
			Granularity:     int(granularity),
		})
	}

	return indexes, rows.Err()
}

func (t *telemetryMetaStore) auditTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "auditTblStatementToFieldKeys",
	})

	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.auditDBName, t.auditLogsTblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := parser.ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalLogs
	}

	return materialisedKeys, nil
}

func (t *telemetryMetaStore) getAuditKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getAuditKeys",
	})

	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	matKeys, err := t.auditTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	var queries []string
	var allArgs []any

	queryAttributeTable := false
	queryResourceTable := false

	for _, selector := range fieldKeySelectors {
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified {
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
		tblName      string
	}{
		{telemetrytypes.FieldContextAttribute, queryAttributeTable, t.auditDBName + "." + t.auditAttributeKeysTblName},
		{telemetrytypes.FieldContextResource, queryResourceTable, t.auditDBName + "." + t.auditResourceKeysTblName},
	}

	for _, table := range tablesToQuery {
		if !table.shouldQuery {
			continue
		}

		fieldContext := table.fieldContext
		tblName := table.tblName

		sb := sqlbuilder.Select(
			"name AS tag_key",
			fmt.Sprintf("'%s' AS tag_type", fieldContext.TagType()),
			"lower(datatype) AS tag_data_type",
			fmt.Sprintf("%d AS priority", getPriorityForContext(fieldContext)),
		).From(tblName)

		var limit int
		conds := []string{}

		for _, fieldKeySelector := range fieldKeySelectors {
			if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified && fieldKeySelector.FieldContext != fieldContext {
				continue
			}

			fieldKeyConds := []string{}
			if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
				fieldKeyConds = append(fieldKeyConds, sb.E("name", fieldKeySelector.Name))
			} else {
				fieldKeyConds = append(fieldKeyConds, sb.ILike("name", "%"+clickhousesql.LikePattern(fieldKeySelector.Name)+"%"))
			}

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

	var limit int
	for _, fieldKeySelector := range fieldKeySelectors {
		limit += fieldKeySelector.Limit
	}
	if limit == 0 {
		limit = 1000
	}

	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0

	// the log and scope contexts have no keys table; they are served by the
	// static fields appended below
	if len(queries) > 0 {
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
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
		defer rows.Close()

		for rows.Next() {
			rowCount++
			if rowCount > limit {
				break
			}

			var name string
			var fieldContext telemetrytypes.FieldContext
			var fieldDataType telemetrytypes.FieldDataType
			var priority uint8
			err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
			if err != nil {
				return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
			}
			key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

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
			return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
	}

	complete := rowCount <= limit

	// Add the matching intrinsic audit fields (same as logs intrinsics: body, severity_text, etc.)
	for _, field := range maps.Values(audittelemetryschema.IntrinsicFields) {
		if !resolvercore.StaticFieldMatchesAny(field, fieldKeySelectors) {
			continue
		}
		if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; added {
			continue
		}
		keys = append(keys, &field)
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

// applyBackwardCompatibleKeys adds backward compatible key aliases to the map.
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

func enrichWithIntrinsicMetricKeys(keys map[string][]*telemetrytypes.TelemetryFieldKey, selectors []*telemetrytypes.FieldKeySelector) map[string][]*telemetrytypes.TelemetryFieldKey {
	if len(selectors) == 0 {
		return keys
	}

	for _, selector := range selectors {
		if selector.Signal != telemetrytypes.SignalMetrics && selector.Signal != telemetrytypes.SignalUnspecified {
			continue
		}
		// If metric filters are provided, do not surface intrinsic metric keys.
		if selector.MetricContext != nil && (selector.MetricContext.MetricName != "" || selector.MetricContext.MetricNamespace != "") {
			continue
		}

		for name, key := range metricstelemetryschema.IntrinsicMetricFieldDefinitions {
			if !selectorMatchesIntrinsicField(selector, key) {
				continue
			}
			keyCopy := key
			keys[name] = append(keys[name], &keyCopy)
		}
	}

	return keys
}

func selectorMatchesIntrinsicField(selector *telemetrytypes.FieldKeySelector, definition telemetrytypes.TelemetryFieldKey) bool {
	if selector.FieldContext != telemetrytypes.FieldContextUnspecified && selector.FieldContext != definition.FieldContext {
		return false
	}

	if selector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified && selector.FieldDataType != definition.FieldDataType {
		return false
	}

	return matchesSelectorName(selector.Name, definition.Name, selector.SelectorMatchType)
}

func matchesSelectorName(selectorName, target string, matchType telemetrytypes.FieldSelectorMatchType) bool {
	if selectorName == "" {
		return true
	}

	switch matchType {
	case telemetrytypes.FieldSelectorMatchTypeExact:
		return strings.EqualFold(selectorName, target)
	default:
		return strings.Contains(strings.ToLower(target), strings.ToLower(selectorName))
	}
}

func (t *telemetryMetaStore) GetKeys(ctx context.Context, orgID valuer.UUID, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	var complete = true
	var err error
	selectors := []*telemetrytypes.FieldKeySelector{}

	if fieldKeySelector != nil {
		selectors = []*telemetrytypes.FieldKeySelector{fieldKeySelector}
	}

	switch fieldKeySelector.Signal {
	case telemetrytypes.SignalTraces:
		keys, complete, err = t.getTracesKeys(ctx, selectors)
	case telemetrytypes.SignalLogs:
		if fieldKeySelector.Source == telemetrytypes.SourceAudit {
			keys, complete, err = t.getAuditKeys(ctx, selectors)
		} else {
			keys, complete, err = t.getLogsKeys(ctx, orgID, selectors)
		}
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
		logsKeys, logsComplete, err := t.getLogsKeys(ctx, orgID, selectors)
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
	mapOfKeys = enrichWithIntrinsicMetricKeys(mapOfKeys, selectors)

	return mapOfKeys, complete, nil
}

func (t *telemetryMetaStore) GetKeysMulti(ctx context.Context, orgID valuer.UUID, fieldKeySelectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {

	logsSelectors := []*telemetrytypes.FieldKeySelector{}
	auditSelectors := []*telemetrytypes.FieldKeySelector{}
	tracesSelectors := []*telemetrytypes.FieldKeySelector{}
	metricsSelectors := []*telemetrytypes.FieldKeySelector{}
	meterSourceMetricsSelectors := []*telemetrytypes.FieldKeySelector{}

	for _, fieldKeySelector := range fieldKeySelectors {
		switch fieldKeySelector.Signal {
		case telemetrytypes.SignalLogs:
			if fieldKeySelector.Source == telemetrytypes.SourceAudit {
				auditSelectors = append(auditSelectors, fieldKeySelector)
			} else {
				logsSelectors = append(logsSelectors, fieldKeySelector)
			}
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

	logsKeys, logsComplete, err := t.getLogsKeys(ctx, orgID, logsSelectors)
	if err != nil {
		return nil, false, err
	}
	auditKeys, auditComplete, err := t.getAuditKeys(ctx, auditSelectors)
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
	complete := logsComplete && auditComplete && tracesComplete && metricsComplete

	mapOfKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
	for _, key := range logsKeys {
		mapOfKeys[key.Name] = append(mapOfKeys[key.Name], key)
	}
	for _, key := range auditKeys {
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
	mapOfKeys = enrichWithIntrinsicMetricKeys(mapOfKeys, fieldKeySelectors)

	return mapOfKeys, complete, nil
}

func (t *telemetryMetaStore) GetKey(ctx context.Context, orgID valuer.UUID, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	keys, _, err := t.GetKeys(ctx, orgID, fieldKeySelector)
	if err != nil {
		return nil, err
	}
	return keys[fieldKeySelector.Name], nil
}

func (t *telemetryMetaStore) getRelatedValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  fieldValueSelector.Signal.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getRelatedValues",
	})

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

	q := querybuilder.NewQueryInfo(ctx, orgID, t.fl, fieldValueSelector.Signal, nil, 0, 0)
	// One column per family spelling, merged current-first, so the
	// suggestions cover rows that carry only an old spelling.
	names := resolvercore.FamilyValueNames(ctx, orgID, t.fl, fieldValueSelector.Signal, fieldValueSelector)
	memberColumns := make([]string, 0, len(names))
	for _, name := range names {
		memberKey := &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        fieldValueSelector.Signal,
			FieldContext:  fieldValueSelector.FieldContext,
			FieldDataType: fieldValueSelector.FieldDataType,
		}
		memberRead, err := t.storage.Read(ctx, q, memberKey)
		memberColumn := memberRead.SQL
		if err != nil {
			// we don't have a explicit column to select from the related metadata table
			// so we will select either from resource_attributes or attributes table
			// in that order
			resourceRead, _ := t.storage.Read(ctx, q, &telemetrytypes.TelemetryFieldKey{
				Name:          name,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			})
			attributeRead, _ := t.storage.Read(ctx, q, &telemetrytypes.TelemetryFieldKey{
				Name:          name,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			})
			memberColumn = fmt.Sprintf("if(notEmpty(%s), %s, %s)", resourceRead.SQL, resourceRead.SQL, attributeRead.SQL)
		}
		memberColumns = append(memberColumns, memberColumn)
	}
	selectColumn := memberColumns[len(memberColumns)-1]
	for i := len(memberColumns) - 2; i >= 0; i-- {
		selectColumn = fmt.Sprintf("if(notEmpty(%s), %s, %s)", memberColumns[i], memberColumns[i], selectColumn)
	}

	sb := sqlbuilder.Select("DISTINCT " + selectColumn).From(t.relatedMetadataDBName + "." + t.relatedMetadataTblName)

	if len(fieldValueSelector.ExistingQuery) != 0 {
		keySelectors := querybuilder.QueryStringToKeysSelectors(fieldValueSelector.ExistingQuery)
		for _, keySelector := range keySelectors {
			keySelector.Signal = fieldValueSelector.Signal
		}
		keySelectors = querybuilder.ExpandKeySelectorsForFamilies(ctx, orgID, t.fl, keySelectors)
		keys, _, err := t.GetKeysMulti(ctx, orgID, keySelectors)
		if err != nil {
			return nil, false, err
		}

		whereClause, err := querybuilder.PrepareWhereClause(fieldValueSelector.ExistingQuery, querybuilder.FilterExprVisitorOpts{
			Context:   ctx,
			Query:     q,
			Storage:   t.storage,
			Logger:    t.logger,
			FieldKeys: keys,
		})
		if err != nil {
			t.logger.WarnContext(ctx, "error parsing existing query for related values", errors.Attr(err))
		}
		if !whereClause.IsEmpty() {
			sb.AddWhereClause(whereClause.WhereClause)
		}
	}

	if fieldValueSelector.StartUnixMilli != 0 {
		sb.Where(sb.GE("unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli != 0 {
		sb.Where(sb.LE("unix_milli", fieldValueSelector.EndUnixMilli))
	}

	// scope to the requested signal's rows;
	if fieldValueSelector.Signal != telemetrytypes.SignalUnspecified {
		sb.Where(sb.E("data_source", fieldValueSelector.Signal.StringValue()))
	}

	if fieldValueSelector.Value != "" {
		var conds []string
		if fieldValueSelector.FieldContext != telemetrytypes.FieldContextAttribute &&
			fieldValueSelector.FieldContext != telemetrytypes.FieldContextResource {
			origContext := key.FieldContext

			// search on attributes
			key.FieldContext = telemetrytypes.FieldContextAttribute
			attrConds, err := t.containsConditions(ctx, q, key, names, fieldValueSelector.Value, sb)
			if err == nil {
				conds = append(conds, attrConds...)
			}

			// search on resource
			key.FieldContext = telemetrytypes.FieldContextResource
			resourceConds, err := t.containsConditions(ctx, q, key, names, fieldValueSelector.Value, sb)
			if err == nil {
				conds = append(conds, resourceConds...)
			}
			key.FieldContext = origContext
		} else {
			keyConds, err := t.containsConditions(ctx, q, key, names, fieldValueSelector.Value, sb)
			if err == nil {
				conds = append(conds, keyConds...)
			}
		}

		if len(conds) != 0 {
			// the key may sit in the resource or attribute map (or both), so OR the
			// two conditions — match if the key's value in either map contains searchText.
			sb.Where(sb.Or(conds...))
		}
	}

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}
	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "query for related values", slog.String("query", query), slog.Any("args", args))

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

func (t *telemetryMetaStore) GetRelatedValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {
	return t.getRelatedValues(ctx, orgID, fieldValueSelector)
}

func (t *telemetryMetaStore) getAuditFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getAuditFieldValues",
	})

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.auditDBName + "." + t.auditFieldsTblName)

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
		switch fieldValueSelector.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			sb.Where(sb.ILike("string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		case telemetrytypes.FieldDataTypeNumber:
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.ILike("toString(number_value)", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		case telemetrytypes.FieldDataTypeUnspecified:
			sb.Where(sb.Or(
				sb.ILike("string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
				sb.ILike("toString(number_value)", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
			))
		}
	}

	// fetch one extra row to detect whether the result set is complete
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	rowCount := 0
	totalCount := 0

	for rows.Next() {
		rowCount++

		var stringValue string
		var numberValue float64
		err = rows.Scan(&stringValue, &numberValue)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
		if stringValue != "" && !seen[stringValue] {
			if totalCount >= limit {
				break
			}
			values.StringValues = append(values.StringValues, stringValue)
			seen[stringValue] = true
			totalCount++
		}
		if numberValue != 0 {
			if totalCount >= limit {
				break
			}
			if !seen[fmt.Sprintf("%f", numberValue)] {
				values.NumberValues = append(values.NumberValues, numberValue)
				seen[fmt.Sprintf("%f", numberValue)] = true
				totalCount++
			}
		}
	}

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

	for _, value := range values.BoolValues {
		if totalCount >= limit {
			complete = false
			break
		}
		if _, ok := mapOfValues[value]; !ok {
			mapOfValues[value] = true
			allUnspecifiedValues.BoolValues = append(allUnspecifiedValues.BoolValues, value)
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

// GetAllValues returns all values and whether the result is complete.
func (t *telemetryMetaStore) GetAllValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	values := &telemetrytypes.TelemetryFieldValues{}
	var complete = true
	var err error

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	switch fieldValueSelector.Signal {
	case telemetrytypes.SignalTraces:
		values, complete, err = t.getSpanFieldValues(ctx, orgID, fieldValueSelector)
	case telemetrytypes.SignalLogs:
		if fieldValueSelector.Source == telemetrytypes.SourceAudit {
			values, complete, err = t.getAuditFieldValues(ctx, fieldValueSelector)
		} else {
			values, complete, err = t.getLogFieldValues(ctx, orgID, fieldValueSelector)
		}
	case telemetrytypes.SignalMetrics:
		if fieldValueSelector.Source == telemetrytypes.SourceMeter {
			values, complete, err = t.getMeterSourceMetricFieldValues(ctx, fieldValueSelector)
		} else {
			values, complete, err = t.getMetricFieldValues(ctx, orgID, fieldValueSelector)
		}
	case telemetrytypes.SignalUnspecified:
		mapOfValues := make(map[any]bool)
		mapOfRelatedValues := make(map[any]bool)
		allUnspecifiedValues := &telemetrytypes.TelemetryFieldValues{}

		tracesValues, tracesComplete, err := t.getSpanFieldValues(ctx, orgID, fieldValueSelector)
		if err == nil {
			populateComplete := populateAllUnspecifiedValues(allUnspecifiedValues, mapOfValues, mapOfRelatedValues, tracesValues, limit)
			complete = complete && tracesComplete && populateComplete
		}

		logsValues, logsComplete, err := t.getLogFieldValues(ctx, orgID, fieldValueSelector)
		if err == nil {
			populateComplete := populateAllUnspecifiedValues(allUnspecifiedValues, mapOfValues, mapOfRelatedValues, logsValues, limit)
			complete = complete && logsComplete && populateComplete
		}

		metricsValues, metricsComplete, err := t.getMetricFieldValues(ctx, orgID, fieldValueSelector)
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

func (t *telemetryMetaStore) FetchTemporality(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricName string) (metrictypes.Temporality, error) {
	if metricName == "" {
		return metrictypes.Unknown, errors.Newf(errors.TypeInternal, errors.CodeInternal, "metric name cannot be empty")
	}

	temporalityMap, err := t.FetchTemporalityMulti(ctx, orgID, queryTimeRangeStartTs, queryTimeRangeEndTs, metricName)
	if err != nil {
		return metrictypes.Unknown, err
	}

	temporality, ok := temporalityMap[metricName]
	if !ok {
		return metrictypes.Unknown, nil
	}

	return temporality, nil
}

func (t *telemetryMetaStore) FetchTemporalityMulti(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, error) {
	temporalities, _, _, err := t.FetchTemporalityAndTypeMulti(ctx, orgID, queryTimeRangeStartTs, queryTimeRangeEndTs, metricNames...)
	return temporalities, err
}

func (t *telemetryMetaStore) FetchTemporalityAndTypeMulti(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, map[string]metrictypes.Type, map[string]bool, error) {
	if len(metricNames) == 0 {
		return make(map[string]metrictypes.Temporality), make(map[string]metrictypes.Type), make(map[string]bool), nil
	}

	reductionEnabled := t.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))

	temporalities := make(map[string]metrictypes.Temporality)
	types := make(map[string]metrictypes.Type)
	metricsTemporality, metricTypes, reduced, err := t.fetchMetricsTemporalityAndType(ctx, queryTimeRangeStartTs, queryTimeRangeEndTs, reductionEnabled, metricNames...)
	if err != nil {
		return nil, nil, nil, err
	}
	meterMetricsTemporality, meterMetricsTypes, err := t.fetchMeterSourceMetricsTemporalityAndType(ctx, metricNames...)
	if err != nil {
		return nil, nil, nil, err
	}

	// For metrics not found in the database, set to Unknown
	for _, metricName := range metricNames {
		if temporality, exists := metricsTemporality[metricName]; exists && len(temporality) > 0 {
			if len(temporality) > 1 {
				temporalities[metricName] = metrictypes.Multiple
			} else {
				temporalities[metricName] = temporality[0]
			}
		} else if temporality, exists := meterMetricsTemporality[metricName]; exists {
			temporalities[metricName] = temporality
		} else {
			temporalities[metricName] = metrictypes.Unknown
		}
		if metricType, exists := metricTypes[metricName]; exists {
			types[metricName] = metricType
		} else if meterMetricType, exists := meterMetricsTypes[metricName]; exists {
			types[metricName] = meterMetricType
		} else {
			types[metricName] = metrictypes.UnspecifiedType
		}
	}

	return temporalities, types, reduced, nil
}

// resolveMetricType applies the non-monotonic-cumulative-sum-as-gauge rule.
// Monotonicity is only meaningful for cumulative sums; delta sums always stay Sum.
func resolveMetricType(metricType metrictypes.Type, isMonotonic bool, temporality metrictypes.Temporality) metrictypes.Type {
	if metricType == metrictypes.SumType && !isMonotonic && temporality == metrictypes.Cumulative {
		return metrictypes.GaugeType
	}
	return metricType
}

func (k *telemetryMetaStore) fetchEvolutionEntryFromClickHouse(ctx context.Context, selectors []*telemetrytypes.EvolutionSelector) ([]*telemetrytypes.EvolutionEntry, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("signal", "column_name", "column_type", "field_context", "field_name", "version", "release_time")
	sb.From(fmt.Sprintf("%s.%s", k.relatedMetadataDBName, k.columnEvolutionMetadataTblName))
	sb.OrderBy("release_time ASC")

	var clauses []string
	for _, selector := range selectors {
		var clause string

		if selector.FieldContext != telemetrytypes.FieldContextUnspecified {
			clause = sb.E("field_context", selector.FieldContext)
		}

		clause = sb.And(clause,
			sb.Or(sb.E("field_name", selector.FieldName), sb.E("field_name", "__all__")),
		)

		clauses = append(clauses, sb.And(sb.E("signal", selector.Signal), clause))
	}
	sb.Where(sb.Or(clauses...))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var entries []*telemetrytypes.EvolutionEntry
	rows, err := k.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var entry telemetrytypes.EvolutionEntry
		var releaseTimeNs float64
		if err := rows.Scan(
			&entry.Signal,
			&entry.ColumnName,
			&entry.ColumnType,
			&entry.FieldContext,
			&entry.FieldName,
			&entry.Version,
			&releaseTimeNs,
		); err != nil {
			return nil, err
		}
		// Convert nanoseconds to time.Time
		releaseTime := time.Unix(0, int64(releaseTimeNs))
		entry.ReleaseTime = releaseTime
		entries = append(entries, &entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return entries, nil
}

// updateColumnEvolutionMetadataForKeys updates the evolution field for keys.
func (k *telemetryMetaStore) updateColumnEvolutionMetadataForKeys(ctx context.Context, keysToUpdate []*telemetrytypes.TelemetryFieldKey) error {
	// an empty selector list would run the evolution query without a filter
	if len(keysToUpdate) == 0 {
		return nil
	}

	var metadataKeySelectors []*telemetrytypes.EvolutionSelector
	for _, keySelector := range keysToUpdate {
		selector := &telemetrytypes.EvolutionSelector{
			Signal:       keySelector.Signal,
			FieldContext: keySelector.FieldContext,
			FieldName:    keySelector.Name,
		}
		metadataKeySelectors = append(metadataKeySelectors, selector)
	}

	evolutions, err := k.fetchEvolutionEntryFromClickHouse(ctx, metadataKeySelectors)
	if err != nil {
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to fetch evolution from clickhouse %s", err.Error())
	}

	evolutionsByUniqueKey := make(map[string][]*telemetrytypes.EvolutionEntry)
	for _, evolution := range evolutions {
		key := &telemetrytypes.EvolutionSelector{
			Signal:       evolution.Signal,
			FieldContext: evolution.FieldContext,
			FieldName:    evolution.FieldName,
		}
		evolutionsByUniqueKey[key.QualifiedName()] = append(evolutionsByUniqueKey[key.QualifiedName()], evolution)
	}

	if len(keysToUpdate) > 0 {
		for i, key := range keysToUpdate {
			selector := &telemetrytypes.EvolutionSelector{
				Signal:       key.Signal,
				FieldContext: key.FieldContext,
				FieldName:    "__all__",
			}
			// the per-field entries add to the column-wide ones, they don't replace them.
			// NOTE: if a field evolved to its own column before an __all__ migration for the
			// same signal+context, that later __all__ entry does not really apply to this field
			// (the field had already moved). We ignore that case as it does not occur currently.
			var keyEvolutions []*telemetrytypes.EvolutionEntry
			keyEvolutions = append(keyEvolutions, evolutionsByUniqueKey[selector.QualifiedName()]...)
			selector.FieldName = key.Name
			keyEvolutions = append(keyEvolutions, evolutionsByUniqueKey[selector.QualifiedName()]...)
			if len(keyEvolutions) > 0 {
				keysToUpdate[i].Evolutions = keyEvolutions
			}
		}
	}
	return nil
}
