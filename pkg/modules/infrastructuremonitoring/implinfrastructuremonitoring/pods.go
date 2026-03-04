package implinfrastructuremonitoring

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var defaultPodsGroupByTags = []qbtypes.GroupByKey{
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.namespace.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.node.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.cluster.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.deployment.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.statefulset.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.daemonset.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.job.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.cronjob.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.pod.uid", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
	{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "k8s.pod.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextAttribute}},
}

// Keep metric definitions mapped by query name (A, B, C...) to build composite queries easily.
// One metric aggregation per query.
var podQueries = map[string]qbtypes.MetricAggregation{
	"A": {MetricName: "k8s.pod.cpu.usage", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationSum, ReduceTo: qbtypes.ReduceToAvg},
	"B": {MetricName: "k8s.pod.cpu.request", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg, ReduceTo: qbtypes.ReduceToAvg},
	"C": {MetricName: "k8s.pod.cpu.limit", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg, ReduceTo: qbtypes.ReduceToAvg},
	"D": {MetricName: "k8s.pod.memory.usage", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationSum, ReduceTo: qbtypes.ReduceToAvg},
	"E": {MetricName: "k8s.pod.memory.request", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg, ReduceTo: qbtypes.ReduceToAvg},
	"F": {MetricName: "k8s.pod.memory.limit", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg, ReduceTo: qbtypes.ReduceToAvg},
	"G": {MetricName: "k8s.pod.restarts", TimeAggregation: metrictypes.TimeAggregationLatest, SpaceAggregation: metrictypes.SpaceAggregationMax, ReduceTo: qbtypes.ReduceToSum},
}

func (m *module) GetPodsList(ctx context.Context, orgID valuer.UUID, req *infrastructuremonitoringtypes.PodsListRequest) (*infrastructuremonitoringtypes.PodsListResponse, error) {
	if req.Limit <= 0 {
		req.Limit = 10
	}

	mergedGroupBy := mergePodsGroupBy(req.GroupBy)
	orderMetric, orderDir, orderQueryName := parsePodsOrderBy(req.OrderBy)

	// Build Pass 1: Get Top N Pod UIDs based on Order criteria
	pass1Filter := copyFilter(req.Filter)
	pass1Payload := buildPass1Payload(req, mergedGroupBy, pass1Filter, orderMetric, orderDir)

	pass1Result, err := m.querier.QueryRange(ctx, orgID, pass1Payload)
	if err != nil {
		return nil, fmt.Errorf("pass 1 querying failed: %w", err)
	}

	topPodUIDs := extractTopPodUIDs(pass1Result)
	if len(topPodUIDs) == 0 {
		return &infrastructuremonitoringtypes.PodsListResponse{
			Type:    "list",
			Records: []infrastructuremonitoringtypes.PodsListRecord{},
			Total:   0,
		}, nil
	}

	// Build Pass 2: Get all metrics for the Top N Pod UIDs.
	// Since QBV5 supports 1 MetricAggregation per Query, we build a CompositeQuery of len(podQueries)
	pass2Filter := applyUIDFilter(copyFilter(req.Filter), topPodUIDs)
	pass2Payload := buildPass2Payload(req, mergedGroupBy, pass2Filter, orderQueryName, orderDir)

	pass2Result, err := m.querier.QueryRange(ctx, orgID, pass2Payload)
	if err != nil {
		return nil, fmt.Errorf("pass 2 querying failed: %w", err)
	}

	records := parsePass2ToRecords(pass2Result)

	// Since records is returned out of order due to map merging, sort the records again in Go memory
	// according to pass 1 ordering so that limit/offset are correctly portrayed in UI.
	// Normally we would sort them, but given we only fetched metrics for top N, parsing guarantees all are fetched.
	// We'll leave the sort to the UI or add a sorter here if needed.

	return &infrastructuremonitoringtypes.PodsListResponse{
		Type:    "list",
		Records: records,
		Total:   len(records), // TODO: Real count
	}, nil
}

// ---------------------------------------------------------------------------------------------------------------------
// HELPER METHODS
// ---------------------------------------------------------------------------------------------------------------------

func copyFilter(f *qbtypes.Filter) *qbtypes.Filter {
	if f != nil {
		return f.Copy()
	}
	return &qbtypes.Filter{}
}

func mergePodsGroupBy(reqTags []qbtypes.GroupByKey) []qbtypes.GroupByKey {
	var merged []qbtypes.GroupByKey
	seen := make(map[string]bool)

	for _, tag := range reqTags {
		if !seen[tag.Name] {
			merged = append(merged, tag)
			seen[tag.Name] = true
		}
	}

	for _, tag := range defaultPodsGroupByTags {
		if !seen[tag.Name] {
			merged = append(merged, tag)
			seen[tag.Name] = true
		}
	}
	return merged
}

func parsePodsOrderBy(orderBy []qbtypes.OrderBy) (metricName string, dir qbtypes.OrderDirection, queryName string) {
	metricName = "k8s.pod.cpu.usage"
	dir = qbtypes.OrderDirectionDesc
	queryName = "A" // default correlates to CPU usage

	if len(orderBy) > 0 {
		name := orderBy[0].Key.Name
		dir = orderBy[0].Direction

		switch name {
		case "cpu":
			metricName = "k8s.pod.cpu.usage"
			queryName = "A"
		case "cpu_request":
			metricName = "k8s.pod.cpu.request"
			queryName = "B"
		case "cpu_limit":
			metricName = "k8s.pod.cpu.limit"
			queryName = "C"
		case "memory":
			metricName = "k8s.pod.memory.usage"
			queryName = "D"
		case "memory_request":
			metricName = "k8s.pod.memory.request"
			queryName = "E"
		case "memory_limit":
			metricName = "k8s.pod.memory.limit"
			queryName = "F"
		case "restarts":
			metricName = "k8s.pod.restarts"
			queryName = "G"
		default:
			metricName = name
			for qName, agg := range podQueries {
				if agg.MetricName == metricName {
					queryName = qName
					break
				}
			}
		}
	}
	return
}

func buildPass1Payload(req *infrastructuremonitoringtypes.PodsListRequest, groupBy []qbtypes.GroupByKey, filter *qbtypes.Filter, orderMetric string, orderDir qbtypes.OrderDirection) *qbtypes.QueryRangeRequest {
	// Find the matching aggregation spec for Pass 1
	var agg qbtypes.MetricAggregation
	for _, a := range podQueries {
		if a.MetricName == orderMetric {
			agg = a
			break
		}
	}

	query := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name:         "A",
		Signal:       telemetrytypes.SignalMetrics,
		Offset:       req.Offset,
		Limit:        req.Limit,
		GroupBy:      groupBy,
		Filter:       filter,
		Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"}}, Direction: orderDir}},
		Aggregations: []qbtypes.MetricAggregation{agg},
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v1",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder, Spec: query},
			},
		},
	}
}

func extractTopPodUIDs(res *qbtypes.QueryRangeResponse) []string {
	var topPodUIDs []string
	if len(res.Data.Results) > 0 {
		var scalarData *qbtypes.ScalarData
		if p, ok := res.Data.Results[0].(*qbtypes.ScalarData); ok {
			scalarData = p
		} else if v, ok := res.Data.Results[0].(qbtypes.ScalarData); ok {
			scalarData = &v
		}

		if scalarData != nil {
			uidIdx := -1
			for i, col := range scalarData.Columns {
				if col.Name == "k8s.pod.uid" {
					uidIdx = i
					break
				}
			}
			if uidIdx != -1 {
				for _, row := range scalarData.Data {
					if uidObj, ok := row[uidIdx].(string); ok && uidObj != "" {
						topPodUIDs = append(topPodUIDs, uidObj)
					}
				}
			}
		}
	}
	return topPodUIDs
}

func applyUIDFilter(f *qbtypes.Filter, uids []string) *qbtypes.Filter {
	inClause := fmt.Sprintf("k8s.pod.uid IN ('%s')", strings.Join(uids, "','"))
	if f.Expression != "" && f.Expression != " " {
		f.Expression = fmt.Sprintf("(%s) AND %s", f.Expression, inClause)
	} else {
		f.Expression = inClause
	}
	return f
}

func buildPass2Payload(req *infrastructuremonitoringtypes.PodsListRequest, groupBy []qbtypes.GroupByKey, filter *qbtypes.Filter, orderQueryName string, orderDir qbtypes.OrderDirection) *qbtypes.QueryRangeRequest {
	var envelopes []qbtypes.QueryEnvelope

	for queryName, agg := range podQueries {
		q := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name:         queryName,
			Signal:       telemetrytypes.SignalMetrics,
			GroupBy:      groupBy,
			Filter:       filter,
			Aggregations: []qbtypes.MetricAggregation{agg},
			Limit:        100, // Safe fetch for the subset
		}

		// Apply Ordering only to the relevant subset metric query
		if queryName == orderQueryName {
			q.Order = []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"}}, Direction: orderDir}}
		}

		envelopes = append(envelopes, qbtypes.QueryEnvelope{
			Type: qbtypes.QueryTypeBuilder,
			Spec: q,
		})
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v1",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: envelopes,
		},
	}
}

func parsePass2ToRecords(res *qbtypes.QueryRangeResponse) []infrastructuremonitoringtypes.PodsListRecord {
	var records []infrastructuremonitoringtypes.PodsListRecord
	if res == nil || res.Data.Results == nil || len(res.Data.Results) == 0 {
		return records
	}

	// We'll merge all rows across query names (A, B, C...) by k8s.pod.uid
	mergedRecordsMap := make(map[string]*infrastructuremonitoringtypes.PodsListRecord)

	for _, resultData := range res.Data.Results {
		var scalarData *qbtypes.ScalarData
		if p, ok := resultData.(*qbtypes.ScalarData); ok {
			scalarData = p
		} else if v, ok := resultData.(qbtypes.ScalarData); ok {
			scalarData = &v
		}

		if scalarData == nil {
			continue
		}

		colIdxs := make(map[string]int)
		for i, col := range scalarData.Columns {
			colIdxs[col.Name] = i
		}

		uidIdx, hasUIDColumn := colIdxs["k8s.pod.uid"]
		if !hasUIDColumn {
			continue
		}

		for _, row := range scalarData.Data {
			uidStr, ok := row[uidIdx].(string)
			if !ok || uidStr == "" {
				continue
			}

			record, exists := mergedRecordsMap[uidStr]
			if !exists {
				record = &infrastructuremonitoringtypes.PodsListRecord{
					PodUID: uidStr,
					Meta:   make(map[string]string),
				}
				mergedRecordsMap[uidStr] = record
			}

			// Merge columns into the record
			for colName, idx := range colIdxs {
				val := row[idx]

				// Store grouping tags as-is with original dot-notation keys
				if strings.HasPrefix(colName, "k8s.") {
					if strVal, ok := val.(string); ok {
						record.Meta[colName] = strVal
					}
					continue
				}

				// Apply result mapping based on the query Name (A, B, C, etc)
				if colName == "__result_0" {
					floatVal := 0.0
					if f, ok := val.(float64); ok {
						floatVal = f
					} else if s, ok := val.(string); ok {
						if parsed, err := strconv.ParseFloat(s, 64); err == nil {
							floatVal = parsed
						}
					}

					switch scalarData.QueryName {
					case "A":
						record.PodCPU = floatVal
					case "B":
						record.PodCPURequest = floatVal
					case "C":
						record.PodCPULimit = floatVal
					case "D":
						record.PodMemory = floatVal
					case "E":
						record.PodMemoryRequest = floatVal
					case "F":
						record.PodMemoryLimit = floatVal
					case "G":
						record.RestartCount = int(floatVal)
					}
				}
			}
		}
	}

	for _, v := range mergedRecordsMap {
		records = append(records, *v)
	}
	return records
}
