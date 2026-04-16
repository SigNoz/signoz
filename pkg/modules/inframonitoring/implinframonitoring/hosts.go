package implinframonitoring

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const (
	hostNameAttrKey = "host.name"
)

// Helper group-by key used across all queries.
var hostNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          hostNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

var hostsTableMetricNamesList = []string{
	"system.cpu.time",
	"system.memory.usage",
	"system.cpu.load_average.15m",
	"system.filesystem.usage",
}

var hostAttrKeysForMetadata = []string{
	"os.type",
}

// orderByToHostsQueryNames maps the orderBy column to the query/formula names
// from HostsTableListQuery used for ranking host groups.
var orderByToHostsQueryNames = map[string][]string{
	inframonitoringtypes.HostsOrderByCPU:       {"A", "B", "F1"},
	inframonitoringtypes.HostsOrderByMemory:    {"C", "D", "F2"},
	inframonitoringtypes.HostsOrderByWait:      {"E", "F", "F3"},
	inframonitoringtypes.HostsOrderByDiskUsage: {"H", "I", "F4"},
	inframonitoringtypes.HostsOrderByLoad15:    {"G"},
}

func (m *module) newHostsTableListQuery() *qbtypes.QueryRangeRequest {
	return &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				// Query A: CPU usage logic (non-idle)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state != 'idle'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query B: CPU usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F1: CPU Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F1",
						Expression: "A/B",
						Legend:     "CPU Usage (%)",
						Disabled:   false,
					},
				},
				// Query C: Memory usage (state = used)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "C",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.memory.usage",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'used'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query D: Memory usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "D",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.memory.usage",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F2: Memory Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F2",
						Expression: "C/D",
						Legend:     "Memory Usage (%)",
						Disabled:   false,
					},
				},
				// Query E: CPU Wait time (state = wait)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "E",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'wait'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query F: CPU time (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "F",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F3: CPU Wait Time (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F3",
						Expression: "E/F",
						Legend:     "CPU Wait Time (%)",
						Disabled:   false,
					},
				},
				// Query G: Load15
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "G",
						Signal: telemetrytypes.SignalMetrics,
						Legend: "CPU Load Average (15m)",
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.load_average.15m",
								Temporality:      metrictypes.Unspecified,
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: false,
					},
				},
				// Query H: Filesystem Usage (state = used)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "H",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.filesystem.usage",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'used'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query I: Filesystem Usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "I",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.filesystem.usage",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F4: Disk Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F4",
						Expression: "H/I",
						Legend:     "Disk Usage (%)",
						Disabled:   false,
					},
				},
			},
		},
	}
}

// getTopHostGroups runs a ranking query for the ordering metric, sorts the
// results, paginates, and backfills from metadataMap when the page extends
// past the metric-ranked groups.
func (m *module) getTopHostGroups(
	ctx context.Context,
	orgID valuer.UUID,
	req *inframonitoringtypes.HostsListRequest,
	metadataMap map[string]map[string]string,
) ([]map[string]string, error) {
	orderByKey := req.OrderBy.Key.Name
	queryNamesForOrderBy := orderByToHostsQueryNames[orderByKey]
	// The last entry is the formula/query whose value we sort by.
	rankingQueryName := queryNamesForOrderBy[len(queryNamesForOrderBy)-1]

	topReq := &qbtypes.QueryRangeRequest{
		Start:       uint64(req.Start),
		End:         uint64(req.End),
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0, len(queryNamesForOrderBy)),
		},
	}

	for _, envelope := range m.newHostsTableListQuery().CompositeQuery.Queries {
		if !slices.Contains(queryNamesForOrderBy, envelope.GetQueryName()) {
			continue
		}
		copied := envelope
		if copied.Type == qbtypes.QueryTypeBuilder {
			existingExpr := ""
			if f := copied.GetFilter(); f != nil {
				existingExpr = f.Expression
			}
			reqFilterExpr := ""
			if req.Filter != nil {
				reqFilterExpr = req.Filter.Expression
			}
			merged := mergeFilterExpressions(existingExpr, reqFilterExpr)
			copied.SetFilter(&qbtypes.Filter{Expression: merged})
			copied.SetGroupBy(req.GroupBy)
		}
		topReq.CompositeQuery.Queries = append(topReq.CompositeQuery.Queries, copied)
	}

	resp, err := m.querier.QueryRange(ctx, orgID, topReq)
	if err != nil {
		return nil, err
	}

	allMetricGroups := parseAndSortGroups(resp, rankingQueryName, req.GroupBy, req.OrderBy.Direction)
	return paginateWithBackfill(allMetricGroups, metadataMap, req.GroupBy, req.Offset, req.Limit), nil
}

// applyHostsActiveStatusFilter modifies req.Filter.Expression to include an IN/NOT IN
// clause based on FilterByStatus and the set of active hosts.
// Returns true if the caller should short-circuit with an empty result (eg. ACTIVE
// requested but no hosts are active).
func (m *module) applyHostsActiveStatusFilter(req *inframonitoringtypes.HostsListRequest, activeHostsMap map[string]bool) (shouldShortCircuit bool) {
	if req.Filter == nil || (req.Filter.FilterByStatus != inframonitoringtypes.HostStatusActive && req.Filter.FilterByStatus != inframonitoringtypes.HostStatusInactive) {
		return false
	}

	activeHosts := make([]string, 0, len(activeHostsMap))
	for host := range activeHostsMap {
		activeHosts = append(activeHosts, fmt.Sprintf("'%s'", host))
	}

	if len(activeHosts) == 0 {
		return req.Filter.FilterByStatus == inframonitoringtypes.HostStatusActive
	}

	op := "IN"
	if req.Filter.FilterByStatus == inframonitoringtypes.HostStatusInactive {
		op = "NOT IN"
	}
	statusClause := fmt.Sprintf("%s %s (%s)", hostNameAttrKey, op, strings.Join(activeHosts, ", "))
	req.Filter.Expression = mergeFilterExpressions(req.Filter.Expression, statusClause)
	return false
}

func (m *module) getHostsTableMetadata(ctx context.Context, req *inframonitoringtypes.HostsListRequest) (map[string]map[string]string, error) {
	var nonGroupByAttrs []string
	for _, key := range hostAttrKeysForMetadata {
		if !isKeyInGroupByAttrs(req.GroupBy, key) {
			nonGroupByAttrs = append(nonGroupByAttrs, key)
		}
	}
	var filter *qbtypes.Filter
	if req.Filter != nil {
		filter = &req.Filter.Filter
	}
	metadataMap, err := m.getMetadata(ctx, hostsTableMetricNamesList, req.GroupBy, nonGroupByAttrs, filter, req.Start, req.End)
	if err != nil {
		return nil, err
	}
	return metadataMap, nil
}

// buildHostRecords constructs the final list of HostRecords for a page.
// Groups that had no metric data get default values of -1.
//
// hostCounts is nil when host.name is in the groupBy — in that case, counts are
// derived directly from activeHostsMap (1/0 per host). When non-nil (custom groupBy
// without host.name), counts are looked up from the map.
func buildHostRecords(
	isHostNameInGroupBy bool,
	resp *qbtypes.QueryRangeResponse,
	pageGroups []map[string]string,
	groupBy []qbtypes.GroupByKey,
	metadataMap map[string]map[string]string,
	activeHostsMap map[string]bool,
	hostCounts map[string]groupHostCounts,
) []inframonitoringtypes.HostRecord {
	metricsMap := parseFullQueryResponse(resp, groupBy)

	records := make([]inframonitoringtypes.HostRecord, 0, len(pageGroups))
	for _, labels := range pageGroups {
		compositeKey := compositeKeyFromLabels(labels, groupBy)
		hostName := labels[hostNameAttrKey]

		activeStatus := inframonitoringtypes.HostStatusNone
		activeHostCount := 0
		inactiveHostCount := 0
		if isHostNameInGroupBy { // derive from activeHostsMap since each row = one host
			if hostName != "" {
				if activeHostsMap[hostName] {
					activeStatus = inframonitoringtypes.HostStatusActive
					activeHostCount = 1
				} else {
					activeStatus = inframonitoringtypes.HostStatusInactive
					inactiveHostCount = 1
				}
			}
		} else { // derive from hostCounts since custom groupBy without host.name
			if counts, ok := hostCounts[compositeKey]; ok {
				activeHostCount = counts.Active
				inactiveHostCount = counts.Inactive
			}
		}

		record := inframonitoringtypes.HostRecord{
			HostName:          hostName,
			Status:            activeStatus,
			ActiveHostCount:   activeHostCount,
			InactiveHostCount: inactiveHostCount,
			CPU:               -1,
			Memory:            -1,
			Wait:              -1,
			Load15:            -1,
			DiskUsage:         -1,
			Meta:              map[string]any{},
		}

		if metrics, ok := metricsMap[compositeKey]; ok {
			if v, exists := metrics["F1"]; exists {
				record.CPU = v
			}
			if v, exists := metrics["F2"]; exists {
				record.Memory = v
			}
			if v, exists := metrics["F3"]; exists {
				record.Wait = v
			}
			if v, exists := metrics["F4"]; exists {
				record.DiskUsage = v
			}
			if v, exists := metrics["G"]; exists {
				record.Load15 = v
			}
		}

		if attrs, ok := metadataMap[compositeKey]; ok {
			for k, v := range attrs {
				record.Meta[k] = v
			}
		}

		records = append(records, record)
	}
	return records
}

// getActiveHostsQuery builds a SelectBuilder that returns distinct host names
// with metrics reported in the last 10 minutes. The builder is not executed —
// callers can either execute it (getActiveHosts) or embed it as a subquery
// (getPerGroupActiveInactiveHostCounts).
func (m *module) getActiveHostsQuery(metricNames []string, hostNameAttr string, sinceUnixMilli int64) *sqlbuilder.SelectBuilder {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Distinct()
	sb.Select("attr_string_value")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(
		sb.In("metric_name", sqlbuilder.List(metricNames)),
		sb.E("attr_name", hostNameAttr),
		sb.NE("attr_string_value", ""),
		sb.GE("last_reported_unix_milli", sinceUnixMilli),
	)

	return sb
}

// getActiveHosts returns a set of host names that have reported metrics recently.
// It queries distributed_metadata for hosts where last_reported_unix_milli >= 10 minutes ago.
func (m *module) getActiveHosts(ctx context.Context, metricNames []string, hostNameAttr string, sinceUnixMilli int64) (map[string]bool, error) {
	sb := m.getActiveHostsQuery(metricNames, hostNameAttr, sinceUnixMilli)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activeHosts := make(map[string]bool)
	for rows.Next() {
		var hostName string
		if err := rows.Scan(&hostName); err != nil {
			return nil, err
		}
		if hostName != "" {
			activeHosts[hostName] = true
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return activeHosts, nil
}

// groupHostCounts holds per-group active and inactive host counts.
type groupHostCounts struct {
	Active   int
	Inactive int
}

// getPerGroupActiveInactiveHostCounts computes the number of active and inactive hosts per group
// for the current page. It queries the timeseries table using the provided filter
// expression (which includes user filter + status filter + page groups IN clause).
// Uses GLOBAL IN with the active-hosts subquery inside uniqExactIf for active count,
// and a simple uniqExactIf for total count. Inactive = total - active (computed in Go).
func (m *module) getPerGroupActiveInactiveHostCounts(
	ctx context.Context,
	req *inframonitoringtypes.HostsListRequest,
	metricNames []string,
	pageGroups []map[string]string,
	sinceUnixMilli int64,
) (map[string]groupHostCounts, error) {

	// Build the full filter expression from req (user filter + status filter) and page groups.
	reqFilterExpr := ""
	if req.Filter != nil {
		reqFilterExpr = req.Filter.Expression
	}
	pageGroupsFilterExpr := buildPageGroupsFilterExpr(pageGroups)
	filterExpr := mergeFilterExpressions(reqFilterExpr, pageGroupsFilterExpr)

	adjustedStart, adjustedEnd, distributedTimeSeriesTableName, _ := telemetrymetrics.WhichTSTableToUse(
		uint64(req.Start), uint64(req.End), nil,
	)

	hostNameExpr := fmt.Sprintf("JSONExtractString(labels, '%s')", hostNameAttrKey)

	sb := sqlbuilder.NewSelectBuilder()
	selectCols := make([]string, 0, len(req.GroupBy)+2)
	for _, key := range req.GroupBy {
		selectCols = append(selectCols,
			fmt.Sprintf("JSONExtractString(labels, %s) AS %s", sb.Var(key.Name), quoteIdentifier(key.Name)),
		)
	}

	activeHostsSQ := m.getActiveHostsQuery(metricNames, hostNameAttrKey, sinceUnixMilli)
	selectCols = append(selectCols,
		fmt.Sprintf("uniqExactIf(%s, %s GLOBAL IN (%s)) AS active_host_count", hostNameExpr, hostNameExpr, sb.Var(activeHostsSQ)),
		fmt.Sprintf("uniqExactIf(%s, %s != '') AS total_host_count", hostNameExpr, hostNameExpr),
	)

	// Build a fingerprint subquery to restrict to fingerprints with actual sample
	// data in the original time range (not the wider timeseries table window).
	fpSB := m.buildSamplesTblFingerprintSubQuery(metricNames, req.Start, req.End)

	sb.Select(selectCols...)
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, distributedTimeSeriesTableName))
	sb.Where(
		sb.In("metric_name", sqlbuilder.List(metricNames)),
		sb.GE("unix_milli", adjustedStart),
		sb.L("unix_milli", adjustedEnd),
		fmt.Sprintf("fingerprint IN (%s)", sb.Var(fpSB)),
	)

	// Apply the combined filter expression (user filter + status filter + page groups IN).
	if filterExpr != "" {
		filterClause, err := m.buildFilterClause(ctx, &qbtypes.Filter{Expression: filterExpr}, req.Start, req.End)
		if err != nil {
			return nil, err
		}
		if filterClause != nil {
			sb.AddWhereClause(filterClause)
		}
	}

	// GROUP BY
	groupByAliases := make([]string, 0, len(req.GroupBy))
	for _, key := range req.GroupBy {
		groupByAliases = append(groupByAliases, quoteIdentifier(key.Name))
	}
	sb.GroupBy(groupByAliases...)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := m.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]groupHostCounts)
	for rows.Next() {
		groupVals := make([]string, len(req.GroupBy))
		scanPtrs := make([]any, 0, len(req.GroupBy)+2)
		for i := range groupVals {
			scanPtrs = append(scanPtrs, &groupVals[i])
		}

		var activeCount, totalCount uint64
		scanPtrs = append(scanPtrs, &activeCount, &totalCount)

		if err := rows.Scan(scanPtrs...); err != nil {
			return nil, err
		}

		compositeKey := compositeKeyFromList(groupVals)
		result[compositeKey] = groupHostCounts{
			Active:   int(activeCount),
			Inactive: int(totalCount - activeCount),
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
