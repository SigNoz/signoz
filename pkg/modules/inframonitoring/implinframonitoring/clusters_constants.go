package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// TODO(nikhilmantri0902): change to k8s.cluster.uid after showing the missing
// data banner. Carried forward from v1 (see k8sClusterUIDAttrKey in
// pkg/query-service/app/inframetrics/clusters.go).
const clusterNameAttrKey = "k8s.cluster.name"

var clusterNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          clusterNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// clustersTableMetricNamesList drives the existence/retention check.
// Includes k8s.node.condition_ready and k8s.pod.phase so the response
// short-circuits cleanly when a cluster doesn't ship those metrics — even
// though they aren't part of the QB composite query (they're queried separately
// via getPerGroupNodeConditionCounts and getPerGroupPodPhaseCounts).
var clustersTableMetricNamesList = []string{
	"k8s.node.cpu.usage",
	"k8s.node.allocatable_cpu",
	"k8s.node.memory.working_set",
	"k8s.node.allocatable_memory",
	"k8s.node.condition_ready", //TODO(nikhilmantri0902): should these metrics be used to count groups k8s.node.condition_ready and k8s.pod.phase
	"k8s.pod.phase",
}

var clusterAttrKeysForMetadata = []string{
	"k8s.cluster.name",
}

var orderByToClustersQueryNames = map[string][]string{
	inframonitoringtypes.ClustersOrderByCPU:               {"A"},
	inframonitoringtypes.ClustersOrderByCPUAllocatable:    {"B"},
	inframonitoringtypes.ClustersOrderByMemory:            {"C"},
	inframonitoringtypes.ClustersOrderByMemoryAllocatable: {"D"},
}

// newClustersTableListQuery builds the composite QB v5 request for the clusters list.
// Cluster-scope metrics are derived by summing per-node metrics within the
// group (default group: k8s.cluster.name). Node condition counts and pod phase
// counts are derived separately via getPerGroupNodeConditionCounts and
// getPerGroupPodPhaseCounts respectively (works for both list and grouped_list
// modes), so neither is included here. Query letters A/B/C/D mirror the v1
// implementation and the v2 nodes list.
func (m *module) newClustersTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: CPU usage — sum of node CPU within the group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.node.cpu.usage",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{clusterNameGroupByKey},
				Disabled: false,
			},
		},
		// Query B: CPU allocatable — sum of node allocatable CPU within the group.
		// TimeAggregationLatest is the closest v5 equivalent of v1's AnyLast;
		// allocatable values change rarely so divergence in practice is negligible.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "B",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.node.allocatable_cpu",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{clusterNameGroupByKey},
				Disabled: false,
			},
		},
		// Query C: Memory working set — sum of node memory within the group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "C",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.node.memory.working_set",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{clusterNameGroupByKey},
				Disabled: false,
			},
		},
		// Query D: Memory allocatable — sum of node allocatable memory within the group.
		// Same Latest caveat as Query B.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "D",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.node.allocatable_memory",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{clusterNameGroupByKey},
				Disabled: false,
			},
		},
	}

	return &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: queries,
		},
	}
}
