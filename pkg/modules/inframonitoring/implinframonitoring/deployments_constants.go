package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	deploymentNameAttrKey     = "k8s.deployment.name"
	deploymentsBaseFilterExpr = "k8s.deployment.name != ''"
)

var deploymentNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          deploymentNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// deploymentsTableMetricNamesList drives the existence/retention check.
// Includes k8s.pod.phase even though phase isn't part of the QB composite query —
// it is queried separately via getPerGroupPodPhaseCounts, and we want the
// response to short-circuit cleanly when the phase metric is absent.
var deploymentsTableMetricNamesList = []string{
	"k8s.pod.phase",
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.deployment.desired",
	"k8s.deployment.available",
}

// Carried forward from v1 deploymentAttrsToEnrich
// (pkg/query-service/app/inframetrics/deployments.go:29-33).
var deploymentAttrKeysForMetadata = []string{
	"k8s.deployment.name",
	"k8s.namespace.name",
	"k8s.cluster.name",
}

// orderByToDeploymentsQueryNames maps the orderBy column to the query name
// used for ranking deployment groups. v2 B/C/E/F are direct metrics, no
// formula deps — so unlike v1 we don't carry A/D.
var orderByToDeploymentsQueryNames = map[string][]string{
	inframonitoringtypes.DeploymentsOrderByCPU:           {"A"},
	inframonitoringtypes.DeploymentsOrderByCPURequest:    {"B"},
	inframonitoringtypes.DeploymentsOrderByCPULimit:      {"C"},
	inframonitoringtypes.DeploymentsOrderByMemory:        {"D"},
	inframonitoringtypes.DeploymentsOrderByMemoryRequest: {"E"},
	inframonitoringtypes.DeploymentsOrderByMemoryLimit:   {"F"},
	inframonitoringtypes.DeploymentsOrderByDesiredPods:   {"H"},
	inframonitoringtypes.DeploymentsOrderByAvailablePods: {"I"},
}

// newDeploymentsTableListQuery builds the composite QB v5 request for the deployments list.
// Eight builder queries: A..F roll up pod-level metrics by deployment, H/I take the
// latest deployment-level desired/available counts. Restarts (v1 query G) is intentionally
// omitted to match the v2 pods pattern.
//
// Every builder query carries a base filter `k8s.deployment.name != ”`.
// Reason: pod-level metrics (A..F) are emitted for every pod regardless of whether the
// pod belongs to a Deployment; only Deployment-owned pods carry the
// `k8s.deployment.name` resource attribute. Without this filter, standalone pods and
// pods owned by other workloads (StatefulSet/DaemonSet/Job/...) collapse into a single
// empty-string group under the default groupBy. v1's GetDeploymentList applied the same
// filter via FilterOperatorExists; this matches v1 parity. The base filter merges
// cleanly with user filters via mergeFilterExpressions / buildFullQueryRequest.
func (m *module) newDeploymentsTableListQuery() *qbtypes.QueryRangeRequest {
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
				Disabled: false,
			},
		},
		// Query H: k8s.deployment.desired — latest known desired replica count per group.
		// v1 used TimeAggregationAnyLast (v3) → mapped to TimeAggregationLatest in v5;
		// SpaceAggregationSum + ReduceToLast preserve v1's "latest, summed across the group".
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "H",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.deployment.desired",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
				Disabled: false,
			},
		},
		// Query I: k8s.deployment.available — latest known available replica count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "I",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.deployment.available",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: deploymentsBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey},
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
