package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const containerNameAttrKey = inframonitoringtypes.ContainerNameAttrKey

const (
	containerStatusStateAttrKey  = "k8s.container.status.state"
	containerStatusReasonAttrKey = "k8s.container.status.reason"
)

const (
	containerStatusStateMetricName  = "k8s.container.status.state"
	containerStatusReasonMetricName = "k8s.container.status.reason"
	containerReadyMetricName        = "k8s.container.ready"
	containerRestartsMetricName     = "k8s.container.restarts"
)

// containerStatusMetricNamesList are the metrics required to derive the
// kubectl-style container display status. Gated by
// getPerGroupContainerStatusCountsWithReqMetricChecks — if either is missing,
// status is skipped and a warning is returned.
var containerStatusMetricNamesList = []string{
	containerStatusStateMetricName,
	containerStatusReasonMetricName,
}

var containerNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          containerNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// containerRowGroupBy is the default row-identity groupBy for the containers
// list: (k8s.pod.uid, k8s.container.name). Stable across container restarts.
// podUIDGroupByKey is shared with the pods module (pods_constants.go).
var containerRowGroupBy = []qbtypes.GroupByKey{podUIDGroupByKey, containerNameGroupByKey}

// containersTableMetricNamesList are the metrics that carry the container
// attributes; used for metadata resolution and the retention check.
var containersTableMetricNamesList = []string{
	"container.cpu.usage",
	"k8s.container.cpu_request_utilization",
	"k8s.container.cpu_limit_utilization",
	"container.memory.working_set",
	"k8s.container.memory_request_utilization",
	"k8s.container.memory_limit_utilization",
	"k8s.container.restarts",
	"k8s.container.ready",
	"k8s.container.status.reason",
	"k8s.container.status.state",
}

var containerAttrKeysForMetadata = []string{
	"k8s.pod.uid",
	"k8s.container.name",
	"k8s.pod.name",
	"container.image.name",
	"container.image.tag",
	"k8s.namespace.name",
	"k8s.node.name",
	"k8s.deployment.name",
	"k8s.statefulset.name",
	"k8s.daemonset.name",
	"k8s.job.name",
	"k8s.cronjob.name",
	"k8s.cluster.name",
}

var orderByToContainersQueryNames = map[string][]string{
	inframonitoringtypes.ContainersOrderByCPU:           {"A"},
	inframonitoringtypes.ContainersOrderByCPURequest:    {"B"},
	inframonitoringtypes.ContainersOrderByCPULimit:      {"C"},
	inframonitoringtypes.ContainersOrderByMemory:        {"D"},
	inframonitoringtypes.ContainersOrderByMemoryRequest: {"E"},
	inframonitoringtypes.ContainersOrderByMemoryLimit:   {"F"},
}

// newContainersTableListQuery builds the composite QB v5 request for the
// containers list (kubeletstats usage/utilization). Status, restarts and ready
// come from k8sclusterreceiver via dedicated queries (works for both list and
// grouped_list modes), so not included here.
func (m *module) newContainersTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: CPU usage (cores)
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "container.cpu.usage",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
						MetricName:       "k8s.container.cpu_request_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
						MetricName:       "k8s.container.cpu_limit_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
						MetricName:       "container.memory.working_set",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
						MetricName:       "k8s.container.memory_request_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
						MetricName:       "k8s.container.memory_limit_utilization",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
						ReduceTo:         qbtypes.ReduceToAvg,
					},
				},
				GroupBy:  containerRowGroupBy,
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
