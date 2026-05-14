package implinframonitoring

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// quoteIdentifier wraps s in backticks for use as a ClickHouse identifier,
// escaping any embedded backticks by doubling them.
func quoteIdentifier(s string) string {
	return fmt.Sprintf("`%s`", strings.ReplaceAll(s, "`", "``"))
}

func isKeyInGroupByAttrs(groupByAttrs []qbtypes.GroupByKey, key string) bool {
	for _, groupBy := range groupByAttrs {
		if groupBy.Name == key {
			return true
		}
	}
	return false
}

func mergeFilterExpressions(queryFilterExpr, reqFilterExpr string) string {
	queryFilterExpr = strings.TrimSpace(queryFilterExpr)
	reqFilterExpr = strings.TrimSpace(reqFilterExpr)
	if queryFilterExpr == "" {
		return reqFilterExpr
	}
	if reqFilterExpr == "" {
		return queryFilterExpr
	}
	return fmt.Sprintf("(%s) AND (%s)", queryFilterExpr, reqFilterExpr)
}

// compositeKeyFromList builds a composite key by joining the given parts
// with a null byte separator. This is the canonical way to construct
// composite keys for group identification across the infra monitoring module.
func compositeKeyFromList(parts []string) string {
	return strings.Join(parts, "\x00")
}

// compositeKeyFromLabels builds a composite key from a label map by extracting
// the value for each groupBy key in order and joining them via compositeKeyFromList.
func compositeKeyFromLabels(labels map[string]string, groupBy []qbtypes.GroupByKey) string {
	parts := make([]string, len(groupBy))
	for i, key := range groupBy {
		parts[i] = labels[key.Name]
	}
	return compositeKeyFromList(parts)
}

// parseAndSortGroups extracts group label maps from a ScalarData response and
// sorts them by the ranking query's aggregation value.
func parseAndSortGroups(
	resp *qbtypes.QueryRangeResponse,
	rankingQueryName string,
	groupBy []qbtypes.GroupByKey,
	direction qbtypes.OrderDirection,
) []rankedGroup {
	if resp == nil || len(resp.Data.Results) == 0 {
		return nil
	}

	// Find the ScalarData that contains the ranking column.
	var sd *qbtypes.ScalarData
	for _, r := range resp.Data.Results {
		candidate, ok := r.(*qbtypes.ScalarData)
		if !ok || candidate == nil {
			continue
		}
		for _, col := range candidate.Columns {
			if col.Type == qbtypes.ColumnTypeAggregation && col.QueryName == rankingQueryName {
				sd = candidate
				break
			}
		}
		if sd != nil {
			break
		}
	}
	if sd == nil || len(sd.Data) == 0 {
		return nil
	}

	groupColIndices := make(map[string]int)
	rankingColIdx := -1
	for i, col := range sd.Columns {
		if col.Type == qbtypes.ColumnTypeGroup {
			groupColIndices[col.Name] = i
		}
		if col.Type == qbtypes.ColumnTypeAggregation && col.QueryName == rankingQueryName {
			rankingColIdx = i
		}
	}
	if rankingColIdx == -1 {
		return nil
	}

	groups := make([]rankedGroup, 0, len(sd.Data))
	for _, row := range sd.Data {
		labels := make(map[string]string, len(groupBy))
		for _, key := range groupBy {
			if idx, ok := groupColIndices[key.Name]; ok && idx < len(row) {
				labels[key.Name] = fmt.Sprintf("%v", row[idx])
			}
		}
		var value float64
		if rankingColIdx < len(row) {
			if v, ok := row[rankingColIdx].(float64); ok {
				value = v
			}
		}
		groups = append(groups, rankedGroup{
			labels:       labels,
			value:        value,
			compositeKey: compositeKeyFromLabels(labels, groupBy),
		})
	}

	sort.Slice(groups, func(i, j int) bool {
		if groups[i].value != groups[j].value {
			if direction == qbtypes.OrderDirectionAsc {
				return groups[i].value < groups[j].value
			}
			return groups[i].value > groups[j].value
		}
		return groups[i].compositeKey < groups[j].compositeKey
	})

	return groups
}

// paginateWithBackfill returns the page of groups for [offset, offset+limit).
// The virtual sorted list is: metric-ranked groups first, then metadata-only
// groups (those in metadataMap but not in metric results) sorted alphabetically.
func paginateWithBackfill(
	metricGroups []rankedGroup,
	metadataMap map[string]map[string]string,
	groupBy []qbtypes.GroupByKey,
	offset, limit int,
) []map[string]string {
	metricKeySet := make(map[string]bool, len(metricGroups))
	for _, g := range metricGroups {
		metricKeySet[g.compositeKey] = true
	}

	metadataOnlyKeys := make([]string, 0)
	for compositeKey := range metadataMap {
		if !metricKeySet[compositeKey] {
			metadataOnlyKeys = append(metadataOnlyKeys, compositeKey)
		}
	}
	sort.Strings(metadataOnlyKeys)

	totalMetric := len(metricGroups)
	totalAll := totalMetric + len(metadataOnlyKeys)

	end := offset + limit
	if end > totalAll {
		end = totalAll
	}
	if offset >= totalAll {
		return nil
	}

	pageGroups := make([]map[string]string, 0, end-offset)
	for i := offset; i < end; i++ {
		if i < totalMetric {
			pageGroups = append(pageGroups, metricGroups[i].labels)
		} else {
			compositeKey := metadataOnlyKeys[i-totalMetric]
			attrs := metadataMap[compositeKey]
			labels := make(map[string]string, len(groupBy))
			for _, key := range groupBy {
				labels[key.Name] = attrs[key.Name]
			}
			pageGroups = append(pageGroups, labels)
		}
	}
	return pageGroups
}

// buildPageGroupsFilterExpr builds a filter expression that restricts results
// to the given page of groups via IN clauses.
// Returns e.g. "host.name IN ('h1','h2') AND os.type IN ('linux','windows')".
func buildPageGroupsFilterExpr(pageGroups []map[string]string) string {
	groupValues := make(map[string][]string)
	for _, labels := range pageGroups {
		for k, v := range labels {
			groupValues[k] = append(groupValues[k], v)
		}
	}

	inClauses := make([]string, 0, len(groupValues))
	for key, values := range groupValues {
		quoted := make([]string, len(values))
		for i, v := range values {
			quoted[i] = fmt.Sprintf("'%s'", v)
		}
		inClauses = append(inClauses, fmt.Sprintf("%s IN (%s)", key, strings.Join(quoted, ", ")))
	}
	return strings.Join(inClauses, " AND ")
}

// buildFullQueryRequest creates a QueryRangeRequest for all metrics,
// restricted to the given page of groups via an IN filter.
// Accepts primitive fields so it can be reused across different v2 APIs
// (hosts, pods, etc.).
func buildFullQueryRequest(
	start int64,
	end int64,
	filterExpr string,
	groupBy []qbtypes.GroupByKey,
	pageGroups []map[string]string,
	tableListQuery *qbtypes.QueryRangeRequest,
) *qbtypes.QueryRangeRequest {
	inFilterExpr := buildPageGroupsFilterExpr(pageGroups)

	fullReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(start),
		End:         uint64(end),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(tableListQuery.CompositeQuery.Queries)),
		},
	}

	for _, envelope := range tableListQuery.CompositeQuery.Queries {
		copied := envelope
		if copied.Type == qbtypes.QueryTypeBuilder {
			existingExpr := ""
			if f := copied.GetFilter(); f != nil {
				existingExpr = f.Expression
			}
			merged := mergeFilterExpressions(existingExpr, filterExpr)
			merged = mergeFilterExpressions(merged, inFilterExpr)
			copied.SetFilter(&qbtypes.Filter{Expression: merged})
			copied.SetGroupBy(groupBy)
		}
		fullReq.CompositeQuery.Queries = append(fullReq.CompositeQuery.Queries, copied)
	}

	return fullReq
}

// parseFullQueryResponse extracts per-group metric values from the full
// composite query response. Returns compositeKey -> (queryName -> value).
// Each enabled query/formula produces its own ScalarData entry in Results,
// so we iterate over all of them and merge metrics per composite key.
func parseFullQueryResponse(
	resp *qbtypes.QueryRangeResponse,
	groupBy []qbtypes.GroupByKey,
) map[string]map[string]float64 {
	result := make(map[string]map[string]float64)
	if resp == nil || len(resp.Data.Results) == 0 {
		return result
	}

	for _, r := range resp.Data.Results {
		sd, ok := r.(*qbtypes.ScalarData)
		if !ok || sd == nil {
			continue
		}

		groupColIndices := make(map[string]int)
		aggCols := make(map[int]string) // col index -> query name
		for i, col := range sd.Columns {
			if col.Type == qbtypes.ColumnTypeGroup {
				groupColIndices[col.Name] = i
			}
			if col.Type == qbtypes.ColumnTypeAggregation {
				aggCols[i] = col.QueryName
			}
		}

		for _, row := range sd.Data {
			labels := make(map[string]string, len(groupBy))
			for _, key := range groupBy {
				if idx, ok := groupColIndices[key.Name]; ok && idx < len(row) {
					labels[key.Name] = fmt.Sprintf("%v", row[idx])
				}
			}
			compositeKey := compositeKeyFromLabels(labels, groupBy)

			if result[compositeKey] == nil {
				result[compositeKey] = make(map[string]float64)
			}
			for idx, queryName := range aggCols {
				if idx < len(row) {
					if v, ok := row[idx].(float64); ok {
						result[compositeKey][queryName] = v
					}
				}
			}
		}
	}
	return result
}

// buildSamplesTblFingerprintSubQuery returns a SelectBuilder that selects distinct fingerprints
// from the samples table for the given metric names andtime range.
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

// getAttributesExistence returns the subset of attrNames that are missing —
// i.e. have never been reported as a label on any of the given metricNames.
// Presence is checked against distributed_metadata without a time-range filter.
func (m *module) getAttributesExistence(ctx context.Context, metricNames, attrNames []string) ([]string, error) {
	if len(attrNames) == 0 {
		return nil, nil
	}
	if len(metricNames) == 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "getAttributesExistence: metricNames must not be empty")
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("attr_name", "count(*) AS cnt")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(
		sb.In("metric_name", sqlbuilder.List(metricNames)),
		sb.In("attr_name", sqlbuilder.List(attrNames)),
	)
	sb.GroupBy("attr_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	present := make(map[string]bool, len(attrNames))
	for rows.Next() {
		var name string
		var cnt uint64
		if err := rows.Scan(&name, &cnt); err != nil {
			return nil, err
		}
		if name != "" && cnt > 0 {
			present[name] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var missing []string
	for _, a := range attrNames {
		if !present[a] {
			missing = append(missing, a)
		}
	}
	return missing, nil
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
