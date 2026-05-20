package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	daemonSetNameAttrKey     = "k8s.daemonset.name"
	daemonSetsBaseFilterExpr = "k8s.daemonset.name != ''"
)

var daemonSetNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          daemonSetNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// daemonSetsTableMetricNamesList drives the existence/retention check.
// Includes k8s.pod.phase even though phase isn't part of the QB composite query —
// it is queried separately via getPerGroupPodPhaseCounts, and we want the
// response to short-circuit cleanly when the phase metric is absent.
var daemonSetsTableMetricNamesList = []string{
	"k8s.pod.phase",
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.daemonset.desired_scheduled_nodes",
	"k8s.daemonset.current_scheduled_nodes",
}

// Carried forward from v1 daemonSetAttrsToEnrich
// (pkg/query-service/app/inframetrics/daemonsets.go:29-33).
var daemonSetAttrKeysForMetadata = []string{
	"k8s.daemonset.name",
	"k8s.namespace.name",
	"k8s.cluster.name",
}

// orderByToDaemonSetsQueryNames maps the orderBy column to the query name
// used for ranking daemonset groups. v2 B/C/E/F are direct metrics, no
// formula deps — so unlike v1 we don't carry A/D.
var orderByToDaemonSetsQueryNames = map[string][]string{
	inframonitoringtypes.DaemonSetsOrderByCPU:           {"A"},
	inframonitoringtypes.DaemonSetsOrderByCPURequest:    {"B"},
	inframonitoringtypes.DaemonSetsOrderByCPULimit:      {"C"},
	inframonitoringtypes.DaemonSetsOrderByMemory:        {"D"},
	inframonitoringtypes.DaemonSetsOrderByMemoryRequest: {"E"},
	inframonitoringtypes.DaemonSetsOrderByMemoryLimit:   {"F"},
	inframonitoringtypes.DaemonSetsOrderByDesiredNodes:  {"H"},
	inframonitoringtypes.DaemonSetsOrderByCurrentNodes:  {"I"},
}

// newDaemonSetsTableListQuery builds the composite QB v5 request for the daemonsets list.
// Eight builder queries: A..F roll up pod-level metrics by daemonset, H/I take the
// latest daemonset-level desired/current scheduled-node counts. Restarts (v1 query G)
// is intentionally omitted to match the v2 pods/deployments/statefulsets/jobs pattern.
//
// Every builder query carries the base filter `daemonSetsBaseFilterExpr`. Reason:
// pod-level metrics (A..F) are emitted for every pod regardless of whether the
// pod belongs to a DaemonSet; only DaemonSet-owned pods carry the
// `k8s.daemonset.name` resource attribute. Without this filter, standalone pods
// and pods owned by other workloads (Deployment/StatefulSet/Job/...) collapse into
// a single empty-string group under the default groupBy. v1's GetDaemonSetList
// applied the same filter via FilterOperatorExists.
func (m *module) newDaemonSetsTableListQuery() *qbtypes.QueryRangeRequest {
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query H: k8s.daemonset.desired_scheduled_nodes — latest known desired node count per group.
		// v1 used TimeAggregationAnyLast (v3) → mapped to TimeAggregationLatest in v5;
		// SpaceAggregationSum + ReduceToLast preserve v1's "latest, summed across the group".
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "H",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.daemonset.desired_scheduled_nodes",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
				Disabled: false,
			},
		},
		// Query I: k8s.daemonset.current_scheduled_nodes — latest known currently scheduled node count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "I",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.daemonset.current_scheduled_nodes",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: daemonSetsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey},
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
