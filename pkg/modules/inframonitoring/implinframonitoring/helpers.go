package implinframonitoring

import (
	"fmt"
	"sort"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// quoteIdentifier wraps s in backticks for use as a ClickHouse identifier,
// escaping any embedded backticks by doubling them.
func quoteIdentifier(s string) string {
	return fmt.Sprintf("`%s`", strings.ReplaceAll(s, "`", "``"))
}

type rankedGroup struct {
	labels map[string]string
	value  float64
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
		groups = append(groups, rankedGroup{labels: labels, value: value})
	}

	sort.Slice(groups, func(i, j int) bool {
		if direction == qbtypes.OrderDirectionAsc {
			return groups[i].value < groups[j].value
		}
		return groups[i].value > groups[j].value
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
		metricKeySet[compositeKeyFromLabels(g.labels, groupBy)] = true
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
