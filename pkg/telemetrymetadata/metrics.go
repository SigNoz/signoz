package telemetrymetadata

import (
	"context"
	"log/slog"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/resolvercore"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// chunkSizeFirstSeenMetricMetadata limits the number of tuples per SQL query to avoid hitting the max_query_size limit.
//
// Calculation Logic:
//
//  1. The Ceiling: 250 KB (256,000 bytes). A conservative safety limit set just below the common DB max_query_size (262KB)
//     to guarantee the database does not reject the query.
//     Reference: https://clickhouse.com/docs/operations/settings/settings#max_query_size
//
//  2. Unit Cost: ~150 bytes per tuple. The estimated "weight" of a single lookup key, summing MetricName (40B),
//     AttrName (30B), AttrValue (64B), and SQL syntax overhead (16B).
//
//  3. Theoretical Max: ~1,706 tuples. The absolute maximum capacity if all keys adhere to the average size (256,000 / 150).
//
//  4. Final Limit: 1600. Rounds down to provide a ~6% safety buffer, accounting for data outliers
//     (unusually long attribute values) and multi-byte character expansion.
const chunkSizeFirstSeenMetricMetadata = 1600

// getMetricsKeys returns the keys from the metrics that match the field selection criteria.
func (t *telemetryMetaStore) getMetricsKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getMetricsKeys",
	})
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
			fieldConds = append(fieldConds, sb.ILike("attr_name", "%"+clickhousesql.LikePattern(fieldKeySelector.Name)+"%"))
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
			if fieldKeySelector.MetricContext.MetricName != "" {
				fieldConds = append(fieldConds, sb.E("metric_name", fieldKeySelector.MetricContext.MetricName))
			}
			if fieldKeySelector.MetricContext.MetricNamespace != "" {
				fieldConds = append(fieldConds, sb.Like("metric_name", clickhousesql.LikePattern(fieldKeySelector.MetricContext.MetricNamespace)+"%"))
			}
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

// getMetricFieldValues returns field values and whether the result is complete.
func (t *telemetryMetaStore) getMetricFieldValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getMetricFieldValues",
	})
	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	values, err := t.getIntrinsicMetricFieldValues(ctx, orgID, fieldValueSelector, limit)
	if err != nil {
		return nil, false, err
	}

	var remainingLimit int
	if values == nil {
		values = &telemetrytypes.TelemetryFieldValues{}
		remainingLimit = limit
	} else {
		remainingLimit = limit - values.NumValues()
	}

	if remainingLimit == 0 {
		return values, values.NumValues() < limit, nil
	}

	sb := sqlbuilder.
		Select("DISTINCT attr_string_value").
		From(t.metricsDBName + "." + t.metricsFieldsTblName)

	if fieldValueSelector.Name != "" {
		if names := resolvercore.FamilyValueNames(ctx, orgID, t.fl, telemetrytypes.SignalMetrics, fieldValueSelector); len(names) > 1 {
			sb.Where(sb.In("attr_name", sqlbuilder.List(names)))
		} else {
			sb.Where(sb.E("attr_name", fieldValueSelector.Name))
		}
	}

	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("attr_type", fieldValueSelector.FieldContext.TagType()))
	}

	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.Where(sb.E("attr_datatype", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricName != "" {
		if metricNames := querybuilder.FamilyMetricNames(ctx, orgID, t.fl, fieldValueSelector.MetricContext.MetricName); len(metricNames) > 1 {
			sb.Where(sb.In("metric_name", sqlbuilder.List(metricNames)))
		} else {
			sb.Where(sb.E("metric_name", fieldValueSelector.MetricContext.MetricName))
		}
	}
	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricNamespace != "" {
		sb.Where(sb.Like("metric_name", clickhousesql.LikePattern(fieldValueSelector.MetricContext.MetricNamespace)+"%"))
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
			sb.Where(sb.ILike("attr_string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		}
	}
	// query one extra to check if we hit the limit
	sb.Limit(remainingLimit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	rowCount := 0
	for rows.Next() {
		rowCount++
		if rowCount > remainingLimit {
			break
		}

		var stringValue string
		if err := rows.Scan(&stringValue); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		values.StringValues = append(values.StringValues, stringValue)
	}
	// hit the limit?
	complete := values.NumValues() < limit // decision on total limit
	return values, complete, nil
}

// getIntrinsicMetricFieldValues returns values, isSearchComplete, error.
func (t *telemetryMetaStore) getIntrinsicMetricFieldValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector, limit int) (*telemetrytypes.TelemetryFieldValues, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getIntrinsicMetricFieldValues",
	})
	key, ok := metricstelemetryschema.IntrinsicMetricFieldDefinitions[fieldValueSelector.Name]
	if !ok {
		return &telemetrytypes.TelemetryFieldValues{}, nil
	}

	if fieldValueSelector.Signal != telemetrytypes.SignalMetrics && fieldValueSelector.Signal != telemetrytypes.SignalUnspecified {
		return &telemetrytypes.TelemetryFieldValues{}, nil
	}

	// if the field context or data type does not match for the requested key (and is not unspecified as well),
	// we should return false to enable searching in metadata table.
	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified && fieldValueSelector.FieldContext != key.FieldContext {
		return &telemetrytypes.TelemetryFieldValues{}, nil
	}
	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified && fieldValueSelector.FieldDataType != key.FieldDataType {
		return &telemetrytypes.TelemetryFieldValues{}, nil
	}

	// no values are surfaced for intrinsic boolean fields.
	if key.FieldDataType == telemetrytypes.FieldDataTypeBool {
		return &telemetrytypes.TelemetryFieldValues{}, nil
	}

	// Reduced metrics live in time_series_v4_reduced + the buffer (is_reduced=false), not the raw
	// tables; query those only when reduction is enabled (the tables may not exist otherwise).
	reductionEnabled := t.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID))
	sources := []struct {
		tableName  string
		extraConds []string
	}{
		{metricstelemetryschema.TimeseriesV41weekTableName, nil},
	}
	if reductionEnabled {
		sources = append(sources,
			struct {
				tableName  string
				extraConds []string
			}{metricstelemetryschema.TimeseriesV4BufferTableName, []string{"is_reduced = false"}},
			struct {
				tableName  string
				extraConds []string
			}{metricstelemetryschema.TimeseriesV4ReducedTableName, nil},
		)
	}

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]struct{})
	for _, src := range sources {
		if len(values.StringValues) >= limit {
			break
		}
		tableValues, err := t.getIntrinsicMetricFieldValuesForTable(ctx, fieldValueSelector, key, src.tableName, limit, src.extraConds...)
		if err != nil {
			return nil, err
		}
		for _, str := range tableValues {
			if _, ok := seen[str]; ok {
				continue
			}
			seen[str] = struct{}{}
			values.StringValues = append(values.StringValues, str)
			if len(values.StringValues) >= limit {
				break
			}
		}
	}
	return values, nil
}

// getIntrinsicMetricFieldValuesForTable returns the distinct intrinsic field values for the
// given key from a single time series table. extraConds are appended verbatim (e.g. the
// buffer's "is_reduced = false" filter).
func (t *telemetryMetaStore) getIntrinsicMetricFieldValuesForTable(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector, key telemetrytypes.TelemetryFieldKey, tableName string, limit int, extraConds ...string) ([]string, error) {
	sb := sqlbuilder.Select(sqlbuilder.Escape(key.Name)).
		From(t.metricsDBName + "." + tableName)

	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricName != "" {
		sb.Where(sb.E("metric_name", fieldValueSelector.MetricContext.MetricName))
	}
	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricNamespace != "" {
		sb.Where(sb.Like("metric_name", clickhousesql.LikePattern(fieldValueSelector.MetricContext.MetricNamespace)+"%"))
	}

	if fieldValueSelector.StartUnixMilli > 0 {
		sb.Where(sb.GE("unix_milli", fieldValueSelector.StartUnixMilli))
	}

	if fieldValueSelector.EndUnixMilli > 0 {
		sb.Where(sb.LE("unix_milli", fieldValueSelector.EndUnixMilli))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			sb.Where(sb.E(key.Name, fieldValueSelector.Value))
		} else {
			sb.Where(sb.ILike(key.Name, "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		}
	}

	for _, cond := range extraConds {
		sb.Where(cond)
	}

	sb.GroupBy(sqlbuilder.Escape(key.Name))
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
	}
	defer rows.Close()

	var values []string
	rowCount := 0
	for rows.Next() {
		rowCount++
		if rowCount > limit {
			break
		}

		var str string
		if err := rows.Scan(&str); err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMetricsKeys.Error())
		}
		values = append(values, str)
	}
	return values, nil
}

func (t *telemetryMetaStore) fetchMetricsTemporalityAndType(ctx context.Context, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, reductionEnabled bool, metricNames ...string) (map[string][]metrictypes.Temporality, map[string]metrictypes.Type, map[string]bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "fetchMetricsTemporalityAndType",
	})
	adjustedStartTs, adjustedEndTs, tsTableName, _ := metricstelemetryschema.WhichTSTableToUse(queryTimeRangeStartTs, queryTimeRangeEndTs, false, nil)

	temporalities, types, err := t.fetchTemporalityTypeForTable(ctx, tsTableName, adjustedStartTs, adjustedEndTs, metricNames)
	if err != nil {
		return nil, nil, nil, err
	}

	reduced := make(map[string]bool)
	if reductionEnabled {
		bufferTemporalities, bufferTypes, err := t.fetchTemporalityTypeForTable(ctx, metricstelemetryschema.TimeseriesV4BufferTableName, adjustedStartTs, adjustedEndTs, metricNames, "is_reduced = false")
		if err != nil {
			return nil, nil, nil, err
		}
		for metricName, bufferTemps := range bufferTemporalities {
			temporalities[metricName] = unionTemporalities(temporalities[metricName], bufferTemps)
		}
		for metricName, metricType := range bufferTypes {
			if _, ok := types[metricName]; !ok {
				types[metricName] = metricType
			}
		}

		reducedTemporalities, reducedTypes, err := t.fetchTemporalityTypeForTable(ctx, metricstelemetryschema.TimeseriesV4ReducedTableName, adjustedStartTs, adjustedEndTs, metricNames)
		if err != nil {
			return nil, nil, nil, err
		}
		for metricName := range reducedTypes {
			reduced[metricName] = true
		}
		for metricName, reducedTemps := range reducedTemporalities {
			if len(temporalities[metricName]) == 0 {
				temporalities[metricName] = reducedTemps
			}
		}
		for metricName, metricType := range reducedTypes {
			if _, ok := types[metricName]; !ok {
				types[metricName] = metricType
			}
		}
	}

	return temporalities, types, reduced, nil
}

// unionTemporalities appends the distinct temporalities from additional to existing.
func unionTemporalities(existing, additional []metrictypes.Temporality) []metrictypes.Temporality {
	for _, t := range additional {
		found := false
		for _, e := range existing {
			if e == t {
				found = true
				break
			}
		}
		if !found {
			existing = append(existing, t)
		}
	}
	return existing
}

func (t *telemetryMetaStore) fetchTemporalityTypeForTable(ctx context.Context, tableName string, adjustedStartTs, adjustedEndTs uint64, metricNames []string, extraConds ...string) (map[string][]metrictypes.Temporality, map[string]metrictypes.Type, error) {
	temporalities := make(map[string][]metrictypes.Temporality)
	types := make(map[string]metrictypes.Type)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "temporality", "any(type) AS type", "argMax(is_monotonic, unix_milli) as is_monotonic")
	sb.From(t.metricsDBName + "." + tableName)
	conds := []string{
		sb.In("metric_name", metricNames),
		sb.GTE("unix_milli", adjustedStartTs),
		sb.LT("unix_milli", adjustedEndTs),
	}
	conds = append(conds, extraConds...)
	sb.Where(conds...)
	sb.GroupBy("metric_name", "temporality")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	t.logger.DebugContext(ctx, "fetching metric temporality", slog.String("query", query), slog.Any("args", args))

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch metric temporality")
	}
	defer rows.Close()

	for rows.Next() {
		var metricName string
		var temporality metrictypes.Temporality
		var metricType metrictypes.Type
		var isMonotonic bool
		if err := rows.Scan(&metricName, &temporality, &metricType, &isMonotonic); err != nil {
			return nil, nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan temporality result")
		}
		if temporality != metrictypes.Unknown {
			temporalities[metricName] = append(temporalities[metricName], temporality)
		}
		metricType = resolveMetricType(metricType, isMonotonic, temporality)
		types[metricName] = metricType
	}
	if err := rows.Err(); err != nil {
		return nil, nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error iterating over metrics temporality rows")
	}

	return temporalities, types, nil
}

// GetFirstSeenFromMetricMetadata queries the metadata table to get the first_seen timestamp
// for each metric-attribute-value combination.
// Returns a map where key is `telemetrytypes.MetricMetadataLookupKey` and value is first_seen in milliseconds.
func (t *telemetryMetaStore) GetFirstSeenFromMetricMetadata(ctx context.Context, lookupKeys []telemetrytypes.MetricMetadataLookupKey) (map[telemetrytypes.MetricMetadataLookupKey]int64, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "GetFirstSeenFromMetricMetadata",
	})
	result := make(map[telemetrytypes.MetricMetadataLookupKey]int64)

	for i := 0; i < len(lookupKeys); i += chunkSizeFirstSeenMetricMetadata {
		end := i + chunkSizeFirstSeenMetricMetadata
		if end > len(lookupKeys) {
			end = len(lookupKeys)
		}
		chunk := lookupKeys[i:end]

		sb := sqlbuilder.Select(
			"metric_name",
			"attr_name",
			"attr_string_value",
			"min(first_reported_unix_milli) AS first_seen",
		).From(t.metricsDBName + "." + t.metricsFieldsTblName)

		lookupItems := make([]interface{}, 0, len(chunk))
		for _, key := range chunk {
			lookupItems = append(lookupItems, sqlbuilder.Tuple(key.MetricName, key.AttributeName, key.AttributeValue))
		}
		sb.Where(
			sb.In(
				sqlbuilder.TupleNames("metric_name", "attr_name", "attr_string_value"),
				lookupItems...,
			),
		)
		sb.GroupBy("metric_name", "attr_name", "attr_string_value")
		sb.OrderBy("first_seen")

		query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

		rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to query metadata for first_seen")
		}

		for rows.Next() {
			var metricName, attrName, attrValue string
			var firstSeen uint64
			if err := rows.Scan(&metricName, &attrName, &attrValue, &firstSeen); err != nil {
				rows.Close()
				return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan metadata first_seen result")
			}
			result[telemetrytypes.MetricMetadataLookupKey{
				MetricName:     metricName,
				AttributeName:  attrName,
				AttributeValue: attrValue,
			}] = int64(firstSeen)
		}

		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to iterate metadata first_seen results")
		}
		rows.Close()
	}

	return result, nil
}

func (t *telemetryMetaStore) FetchLastSeenInfoMulti(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]int64, error) {
	lastSeenInfo, err := t.fetchLastSeenInfoForTable(ctx, metricstelemetryschema.TimeseriesV4TableName, metricNames)
	if err != nil {
		return nil, err
	}

	if t.fl.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		reducedLastSeen, err := t.fetchLastSeenInfoForTable(ctx, metricstelemetryschema.TimeseriesV4ReducedTableName, metricNames)
		if err != nil {
			return nil, err
		}
		for metricName, ts := range reducedLastSeen {
			if ts > lastSeenInfo[metricName] {
				lastSeenInfo[metricName] = ts
			}
		}
	}

	return lastSeenInfo, nil
}

func (t *telemetryMetaStore) fetchLastSeenInfoForTable(ctx context.Context, tableName string, metricNames []string) (map[string]int64, error) {
	sb := sqlbuilder.Select(
		"metric_name",
		"max(unix_milli)",
	).
		From(t.metricsDBName + "." + tableName)
	sb.Where(sb.In("metric_name", metricNames))
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "fetching metric last seen timestamp", slog.String("query", query), slog.Any("args", args))

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch metric last seen info")
	}
	defer rows.Close()

	lastSeenInfo := make(map[string]int64)
	for rows.Next() {
		var metricName string
		var unix_milli int64
		if err := rows.Scan(&metricName, &unix_milli); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan last seen info result")
		}
		lastSeenInfo[metricName] = unix_milli
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error iterating over metrics temporality rows")
	}
	return lastSeenInfo, nil
}

// containsConditions compiles a contains search over the key and its family
// spellings, which stand as their own metadata.
func (t *telemetryMetaStore) containsConditions(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, names []string, value string, sb *sqlbuilder.SelectBuilder) ([]string, error) {
	// A family forms only over string keys with a signal. The table stores
	// only string maps, so an unspecified data type is a string here.
	dataType := key.FieldDataType
	if dataType == telemetrytypes.FieldDataTypeUnspecified {
		dataType = telemetrytypes.FieldDataTypeString
	}
	fieldKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey, len(names))
	for _, name := range names {
		fieldKeys[name] = []*telemetrytypes.TelemetryFieldKey{{
			Name:          name,
			Signal:        key.Signal,
			FieldContext:  key.FieldContext,
			FieldDataType: dataType,
		}}
	}
	conds, _, err := querybuilder.Conditions(ctx, q, t.storage, key, qbtypes.FilterOperatorContains, value, fieldKeys, false, sb)
	return conds, err
}
