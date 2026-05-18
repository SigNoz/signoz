package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	nodeNameAttrKey         = "k8s.node.name"
	nodeConditionMetricName = "k8s.node.condition_ready"
)

var nodeNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          nodeNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// nodesTableMetricNamesList drives the existence/retention check.
// Includes condition_ready and pod.phase also.
var nodesTableMetricNamesList = []string{
	"k8s.node.cpu.usage",
	"k8s.node.allocatable_cpu",
	"k8s.node.memory.working_set",
	"k8s.node.allocatable_memory",
	"k8s.node.condition_ready",
	"k8s.pod.phase",
}

var nodeAttrKeysForMetadata = []string{
	"k8s.node.uid",
	"k8s.cluster.name",
}

var orderByToNodesQueryNames = map[string][]string{
	inframonitoringtypes.NodesOrderByCPU:               {"A"},
	inframonitoringtypes.NodesOrderByCPUAllocatable:    {"B"},
	inframonitoringtypes.NodesOrderByMemory:            {"C"},
	inframonitoringtypes.NodesOrderByMemoryAllocatable: {"D"},
}

// newNodesTableListQuery builds the composite QB v5 request for the nodes list.
// Node condition is derived separately via getPerGroupNodeConditionCounts (works
// for both list and grouped_list modes), so no condition query is included here.
func (m *module) newNodesTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: CPU usage
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
				GroupBy:  []qbtypes.GroupByKey{nodeNameGroupByKey},
				Disabled: false,
			},
		},
		// Query B: CPU allocatable.
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
				GroupBy:  []qbtypes.GroupByKey{nodeNameGroupByKey},
				Disabled: false,
			},
		},
		// Query C: Memory working set
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
				GroupBy:  []qbtypes.GroupByKey{nodeNameGroupByKey},
				Disabled: false,
			},
		},
		// Query D: Memory allocatable. Same Latest caveat as Query B.
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
				GroupBy:  []qbtypes.GroupByKey{nodeNameGroupByKey},
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
