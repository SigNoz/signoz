package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	podUIDAttrKey       = "k8s.pod.uid"
	podStartTimeAttrKey = "k8s.pod.start_time"
	podPhaseMetricName  = "k8s.pod.phase"
)

var podUIDGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          podUIDAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

var podsTableMetricNamesList = []string{
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.pod.phase",
}

var podAttrKeysForMetadata = []string{
	"k8s.pod.uid",
	"k8s.pod.name",
	"k8s.namespace.name",
	"k8s.node.name",
	"k8s.deployment.name",
	"k8s.statefulset.name",
	"k8s.daemonset.name",
	"k8s.job.name",
	"k8s.cronjob.name",
	"k8s.cluster.name",
	"k8s.pod.start_time",
}

var orderByToPodsQueryNames = map[string][]string{
	inframonitoringtypes.PodsOrderByCPU:           {"A"},
	inframonitoringtypes.PodsOrderByCPURequest:    {"B"},
	inframonitoringtypes.PodsOrderByCPULimit:      {"C"},
	inframonitoringtypes.PodsOrderByMemory:        {"D"},
	inframonitoringtypes.PodsOrderByMemoryRequest: {"E"},
	inframonitoringtypes.PodsOrderByMemoryLimit:   {"F"},
}

// newPodsTableListQuery builds the composite QB v5 request for the pods list.
// Pod phase is derived separately via getPerGroupPodPhaseCounts (works for both
// list and grouped_list modes), so no phase query is included here.
func (m *module) newPodsTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: CPU usage
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.cpu.usage",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
				Disabled: false,
			},
		},
		// Query B: CPU request utilization
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "B",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.cpu_request_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
				Disabled: false,
			},
		},
		// Query C: CPU limit utilization
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "C",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.cpu_limit_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
				Disabled: false,
			},
		},
		// Query D: Memory working set
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "D",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.memory.working_set",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
				Disabled: false,
			},
		},
		// Query E: Memory request utilization
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "E",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.memory_request_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
				Disabled: false,
			},
		},
		// Query F: Memory limit utilization
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "F",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.pod.memory_limit_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  []qbtypes.GroupByKey{podUIDGroupByKey},
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
