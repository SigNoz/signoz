package implinframonitoring

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// buildSamplesTblFingerprintSubQuery returns a SelectBuilder that selects distinct fingerprints
// from the samples table for the given metric names andtime range.
// The timeseries tables are ReplacingMergeTrees with bucketed granularity, so
// WhichTSTableToUse widens the window — this subquery helps restricts to fingerprints
// that actually have sample data in the requested range.
func (m *module) buildSamplesTblFingerprintSubQuery(metricNames []string, startMs, endMs int64) *sqlbuilder.SelectBuilder {
	samplesTableName := telemetrymetrics.WhichSamplesTableToUse(
		uint64(startMs), uint64(endMs),
		metrictypes.UnspecifiedType,
		metrictypes.TimeAggregationUnspecified,
		nil,
	)
	localSamplesTable := strings.TrimPrefix(samplesTableName, "distributed_")
	fpSB := sqlbuilder.NewSelectBuilder()
	fpSB.Select("DISTINCT fingerprint")
	fpSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, localSamplesTable))
	fpSB.Where(
		fpSB.In("metric_name", sqlbuilder.List(metricNames)),
		fpSB.GE("unix_milli", startMs),
		fpSB.L("unix_milli", endMs),
	)
	return fpSB
}

func (m *module) buildFilterClause(ctx context.Context, filter *qbtypes.Filter, startMillis, endMillis int64) (*sqlbuilder.WhereClause, error) {
	expression := ""
	if filter != nil {
		expression = strings.TrimSpace(filter.Expression)
	}
	if expression == "" {
		return sqlbuilder.NewWhereClause(), nil
	}

	whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(expression)
	for idx := range whereClauseSelectors {
		whereClauseSelectors[idx].Signal = telemetrytypes.SignalMetrics
		whereClauseSelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	keys, _, err := m.telemetryMetadataStore.GetKeysMulti(ctx, whereClauseSelectors)
	if err != nil {
		return nil, err
	}

	opts := querybuilder.FilterExprVisitorOpts{
		Context:          ctx,
		Logger:           m.logger,
		FieldMapper:      m.fieldMapper,
		ConditionBuilder: m.condBuilder,
		FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "metric_name", FieldContext: telemetrytypes.FieldContextMetric},
		FieldKeys:        keys,
		StartNs:          querybuilder.ToNanoSecs(uint64(startMillis)),
		EndNs:            querybuilder.ToNanoSecs(uint64(endMillis)),
	}

	whereClause, err := querybuilder.PrepareWhereClause(expression, opts)
	if err != nil {
		return nil, err
	}

	if whereClause == nil || whereClause.WhereClause == nil {
		return sqlbuilder.NewWhereClause(), nil
	}

	return whereClause.WhereClause, nil
}

// NOTE: this method is not specific to infra monitoring — it queries attributes_metadata generically.
// Consider moving to telemetryMetaStore when a second use case emerges.
//
// getMetricsExistenceAndEarliestTime checks which of the given metric names have been
// reported. It returns a list of missing metrics (those not found or with zero count)
// and the earliest first-reported timestamp across all present metrics.
// When all metrics are missing, minFirstReportedUnixMilli is 0.
// TODO(nikhilmantri0902, srikanthccv): This method was designed this way because querier errors if any of the metrics
// in the querier list was never sent, the QueryRange call throws not found error. Modify this method, if QueryRange
// behaviour changes towards this.
func (m *module) getMetricsExistenceAndEarliestTime(ctx context.Context, metricNames []string) ([]string, uint64, error) {
	if len(metricNames) == 0 {
		return nil, 0, nil
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("metric_name", "count(*) AS cnt", "min(first_reported_unix_milli) AS min_first_reported")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(sb.In("metric_name", sqlbuilder.List(metricNames)))
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	type metricInfo struct {
		count            uint64
		minFirstReported uint64
	}
	found := make(map[string]metricInfo, len(metricNames))

	for rows.Next() {
		var name string
		var cnt, minFR uint64
		if err := rows.Scan(&name, &cnt, &minFR); err != nil {
			return nil, 0, err
		}
		found[name] = metricInfo{count: cnt, minFirstReported: minFR}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	var missingMetrics []string
	var globalMinFirstReported uint64
	for _, name := range metricNames {
		info, ok := found[name]
		if !ok || info.count == 0 {
			missingMetrics = append(missingMetrics, name)
			continue
		}
		if globalMinFirstReported == 0 || info.minFirstReported < globalMinFirstReported {
			globalMinFirstReported = info.minFirstReported
		}
	}

	return missingMetrics, globalMinFirstReported, nil
}

// getMetadata fetches the latest values of additionalCols for each unique combination of groupBy keys,
// within the given time range and metric names. It uses argMax(tuple(...), unix_milli) to ensure
// we always pick attribute values from the latest timestamp for each group.
// The returned map has a composite key of groupBy column values joined by "\x00" (null byte),
// mapping to a flat map of attr_name -> attr_value (includes both groupBy and additional cols).
func (m *module) getMetadata(
	ctx context.Context,
	metricNames []string,
	groupBy []qbtypes.GroupByKey,
	additionalCols []string,
	filter *qbtypes.Filter,
	startMs, endMs int64,
) (map[string]map[string]string, error) {
	if len(metricNames) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricNames must not be empty")
	}
	if len(groupBy) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "groupBy must not be empty")
	}

	// Pick the optimal timeseries table based on time range; also get adjusted start.
	adjustedStart, adjustedEnd, distributedTableName, _ := telemetrymetrics.WhichTSTableToUse(
		uint64(startMs), uint64(endMs), nil,
	)

	fpSB := m.buildSamplesTblFingerprintSubQuery(metricNames, startMs, endMs)

	// Flatten groupBy keys to string names for SQL expressions and result scanning.
	groupByCols := make([]string, len(groupBy))
	for i, key := range groupBy {
		groupByCols[i] = key.Name
	}
	allCols := append(groupByCols, additionalCols...)

	// --- Build inner query ---
	innerSB := sqlbuilder.NewSelectBuilder()

	// Inner SELECT columns: JSONExtractString for each groupBy col + argMax(tuple(...)) for additional cols
	innerSelectCols := make([]string, 0, len(groupByCols)+1)
	for _, col := range groupByCols {
		innerSelectCols = append(innerSelectCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", innerSB.Var(col), quoteIdentifier(col)),
		)
	}

	// Build the argMax(tuple(...), unix_milli) expression for all additional cols
	if len(additionalCols) > 0 {
		tupleArgs := make([]string, 0, len(additionalCols))
		for _, col := range additionalCols {
			tupleArgs = append(tupleArgs, fmt.Sprintf("JSONExtractString(labels, %s)", innerSB.Var(col)))
		}
		innerSelectCols = append(innerSelectCols,
			fmt.Sprintf("argMax(tuple(%s), unix_milli) AS latest_attrs", strings.Join(tupleArgs, ", ")),
		)
	}

	innerSB.Select(innerSelectCols...)
	innerSB.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTableName))
	innerSB.Where(
		innerSB.In("metric_name", sqlbuilder.List(metricNames)),
		innerSB.GE("unix_milli", adjustedStart),
		innerSB.L("unix_milli", adjustedEnd),
		fmt.Sprintf("fingerprint IN (%s)", innerSB.Var(fpSB)),
	)

	// Apply optional filter expression
	if filter != nil && strings.TrimSpace(filter.Expression) != "" {
		filterClause, err := m.buildFilterClause(ctx, filter, startMs, endMs)
		if err != nil {
			return nil, err
		}
		if filterClause != nil {
			innerSB.AddWhereClause(filterClause)
		}
	}

	groupByAliases := make([]string, 0, len(groupByCols))
	for _, col := range groupByCols {
		groupByAliases = append(groupByAliases, quoteIdentifier(col))
	}
	innerSB.GroupBy(groupByAliases...)

	innerQuery, innerArgs := innerSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	// --- Build outer query ---
	// Outer SELECT columns: groupBy cols directly + tupleElement(latest_attrs, N) for each additionalCol
	outerSelectCols := make([]string, 0, len(allCols))
	for _, col := range groupByCols {
		outerSelectCols = append(outerSelectCols, quoteIdentifier(col))
	}
	for i, col := range additionalCols {
		outerSelectCols = append(outerSelectCols,
			fmt.Sprintf("tupleElement(latest_attrs, %d) AS %s", i+1, quoteIdentifier(col)),
		)
	}

	outerSB := sqlbuilder.NewSelectBuilder()
	outerSB.Select(outerSelectCols...)
	outerSB.From(fmt.Sprintf("(%s)", innerQuery))

	outerQuery, _ := outerSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	// All ? params are in innerArgs; outer query introduces none of its own.

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, outerQuery, innerArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]map[string]string)

	for rows.Next() {
		row := make([]string, len(allCols))
		scanPtrs := make([]any, len(row))
		for i := range row {
			scanPtrs[i] = &row[i]
		}

		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}

		compositeKey := compositeKeyFromList(row[:len(groupByCols)])

		attrMap := make(map[string]string, len(allCols))
		for i, col := range allCols {
			attrMap[col] = row[i]
		}
		result[compositeKey] = attrMap
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
