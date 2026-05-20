package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	statefulSetNameAttrKey     = "k8s.statefulset.name"
	statefulSetsBaseFilterExpr = "k8s.statefulset.name != ''"
)

var statefulSetNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          statefulSetNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// statefulSetsTableMetricNamesList drives the existence/retention check.
// Includes k8s.pod.phase even though phase isn't part of the QB composite query —
// it is queried separately via getPerGroupPodPhaseCounts, and we want the
// response to short-circuit cleanly when the phase metric is absent.
var statefulSetsTableMetricNamesList = []string{
	"k8s.pod.phase",
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.statefulset.desired_pods",
	"k8s.statefulset.current_pods",
}

// Carried forward from v1 statefulSetAttrsToEnrich
// (pkg/query-service/app/inframetrics/statefulsets.go:29-33).
var statefulSetAttrKeysForMetadata = []string{
	"k8s.statefulset.name",
	"k8s.namespace.name",
	"k8s.cluster.name",
}

// orderByToStatefulSetsQueryNames maps the orderBy column to the query name
// used for ranking statefulset groups. v2 B/C/E/F are direct metrics, no
// formula deps — so unlike v1 we don't carry A/D.
var orderByToStatefulSetsQueryNames = map[string][]string{
	inframonitoringtypes.StatefulSetsOrderByCPU:           {"A"},
	inframonitoringtypes.StatefulSetsOrderByCPURequest:    {"B"},
	inframonitoringtypes.StatefulSetsOrderByCPULimit:      {"C"},
	inframonitoringtypes.StatefulSetsOrderByMemory:        {"D"},
	inframonitoringtypes.StatefulSetsOrderByMemoryRequest: {"E"},
	inframonitoringtypes.StatefulSetsOrderByMemoryLimit:   {"F"},
	inframonitoringtypes.StatefulSetsOrderByDesiredPods:   {"H"},
	inframonitoringtypes.StatefulSetsOrderByCurrentPods:   {"I"},
}

// newStatefulSetsTableListQuery builds the composite QB v5 request for the statefulsets list.
// Eight builder queries: A..F roll up pod-level metrics by statefulset, H/I take the
// latest statefulset-level desired/current counts. Restarts (v1 query G) is intentionally
// omitted to match the v2 pods/deployments pattern.
//
// Every builder query carries a base filter `k8s.statefulset.name != ”`.
// Reason: pod-level metrics (A..F) are emitted for every pod regardless of whether the
// pod belongs to a StatefulSet; only StatefulSet-owned pods carry the
// `k8s.statefulset.name` resource attribute. Without this filter, standalone pods and
// pods owned by other workloads (Deployment/DaemonSet/Job/...) collapse into a single
// empty-string group under the default groupBy. v1's GetStatefulSetList applied the same
// filter via FilterOperatorExists; this matches v1 parity. The base filter merges
// cleanly with user filters via mergeFilterExpressions / buildFullQueryRequest.
func (m *module) newStatefulSetsTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: k8s.pod.cpu.usage — sum of pod CPU within the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query B: k8s.pod.cpu_request_utilization — avg across pods in the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query C: k8s.pod.cpu_limit_utilization — avg across pods in the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query D: k8s.pod.memory.working_set — sum of pod memory within the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query E: k8s.pod.memory_request_utilization — avg across pods in the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query F: k8s.pod.memory_limit_utilization — avg across pods in the group.
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
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query H: k8s.statefulset.desired_pods — latest known desired replica count per group.
		// v1 used TimeAggregationAnyLast (v3) → mapped to TimeAggregationLatest in v5;
		// SpaceAggregationSum + ReduceToLast preserve v1's "latest, summed across the group".
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "H",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.statefulset.desired_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query I: k8s.statefulset.current_pods — latest known current replica count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "I",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.statefulset.current_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: statefulSetsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey},
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
