package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	jobNameAttrKey     = "k8s.job.name"
	jobsBaseFilterExpr = "k8s.job.name != ''"
)

var jobNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          jobNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// jobsTableMetricNamesList drives the existence/retention check.
// Includes k8s.pod.phase even though phase isn't part of the QB composite query —
// it is queried separately via getPerGroupPodPhaseCounts, and we want the
// response to short-circuit cleanly when the phase metric is absent.
var jobsTableMetricNamesList = []string{
	"k8s.pod.phase",
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.job.active_pods",
	"k8s.job.failed_pods",
	"k8s.job.successful_pods",
	"k8s.job.desired_successful_pods",
}

// Carried forward from v1 jobAttrsToEnrich
// (pkg/query-service/app/inframetrics/jobs.go:31-35).
var jobAttrKeysForMetadata = []string{
	"k8s.job.name",
	"k8s.namespace.name",
	"k8s.cluster.name",
}

// orderByToJobsQueryNames maps the orderBy column to the query name
// used for ranking job groups. v2 B/C/E/F are direct metrics, no
// formula deps — so unlike v1 we don't carry A/D.
var orderByToJobsQueryNames = map[string][]string{
	inframonitoringtypes.JobsOrderByCPU:                   {"A"},
	inframonitoringtypes.JobsOrderByCPURequest:            {"B"},
	inframonitoringtypes.JobsOrderByCPULimit:              {"C"},
	inframonitoringtypes.JobsOrderByMemory:                {"D"},
	inframonitoringtypes.JobsOrderByMemoryRequest:         {"E"},
	inframonitoringtypes.JobsOrderByMemoryLimit:           {"F"},
	inframonitoringtypes.JobsOrderByDesiredSuccessfulPods: {"H"},
	inframonitoringtypes.JobsOrderByActivePods:            {"I"},
	inframonitoringtypes.JobsOrderByFailedPods:            {"J"},
	inframonitoringtypes.JobsOrderBySuccessfulPods:        {"K"},
}

// newJobsTableListQuery builds the composite QB v5 request for the jobs list.
// Ten builder queries: A..F roll up pod-level metrics by job, H/I/J/K take the
// latest job-level desired/active/failed/successful counts. Restarts (v1 query G)
// is intentionally omitted to match the v2 pods/deployments pattern.
//
// Every builder query carries the base filter `jobsBaseFilterExpr`. Reason:
// pod-level metrics (A..F) are emitted for every pod regardless of whether the
// pod belongs to a Job; only Job-owned pods carry the `k8s.job.name` resource
// attribute. Without this filter, standalone pods and pods owned by other
// workloads (Deployment/StatefulSet/DaemonSet/...) collapse into a single
// empty-string group under the default groupBy.
func (m *module) newJobsTableListQuery() *qbtypes.QueryRangeRequest {
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
				Disabled: false,
			},
		},
		// Query H: k8s.job.desired_successful_pods — latest known desired completion count per group.
		// v1 used TimeAggregationAnyLast (v3) → mapped to TimeAggregationLatest in v5;
		// SpaceAggregationSum + ReduceToLast preserve v1's "latest, summed across the group".
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "H",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.job.desired_successful_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
				Disabled: false,
			},
		},
		// Query I: k8s.job.active_pods — latest known active pod count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "I",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.job.active_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
				Disabled: false,
			},
		},
		// Query J: k8s.job.failed_pods — cumulative failed pod count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "J",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.job.failed_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
				Disabled: false,
			},
		},
		// Query K: k8s.job.successful_pods — cumulative successful pod count per group.
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "K",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.job.successful_pods",
						TimeAggregation:  metrictypes.TimeAggregationLatest,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter:   &qbtypes.Filter{Expression: jobsBaseFilterExpr},
				GroupBy:  []qbtypes.GroupByKey{jobNameGroupByKey},
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
