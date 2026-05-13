package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	persistentVolumeClaimNameAttrKey = "k8s.persistentvolumeclaim.name"
	volumesBaseFilterExpr            = "k8s.persistentvolumeclaim.name != ''"
)

var pvcNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          persistentVolumeClaimNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// volumesTableMetricNamesList drives the existence/retention check.
var volumesTableMetricNamesList = []string{
	"k8s.volume.available",
	"k8s.volume.capacity",
	"k8s.volume.inodes",
	"k8s.volume.inodes.free",
	"k8s.volume.inodes.used",
}

// Carried forward from v1 volumeAttrsToEnrich
// (pkg/query-service/app/inframetrics/pvcs.go:23-31).
var volumeAttrKeysForMetadata = []string{
	"k8s.persistentvolumeclaim.name",
	"k8s.pod.uid",
	"k8s.pod.name",
	"k8s.namespace.name",
	"k8s.node.name",
	"k8s.statefulset.name",
	"k8s.cluster.name",
}

// orderByToVolumesQueryNames maps the orderBy column to the query/formula names
// from newVolumesTableListQuery used for ranking volume groups. For "usage",
// the formula F1 = B - A is the ranking column, with A and B carried as deps
// (mirrors the hosts pattern in orderByToHostsQueryNames).
var orderByToVolumesQueryNames = map[string][]string{
	inframonitoringtypes.VolumesOrderByAvailable:  {"A"},
	inframonitoringtypes.VolumesOrderByCapacity:   {"B"},
	inframonitoringtypes.VolumesOrderByUsage:      {"A", "B", "F1"},
	inframonitoringtypes.VolumesOrderByInodes:     {"C"},
	inframonitoringtypes.VolumesOrderByInodesFree: {"D"},
	inframonitoringtypes.VolumesOrderByInodesUsed: {"E"},
}

// newVolumesTableListQuery builds the composite QB v5 request for the volumes list.
// Five builder queries (A..E) cover the v1 volume metrics; formula F1 = B - A
// derives usage = capacity - available (mirrors v1's F1 in PvcsTableListQuery).
// Every builder query carries a base filter `k8s.persistentvolumeclaim.name != ”`.
// Reason: the kubeletstats receiver emits `k8s.volume.*` metrics for every volume
// mount on a pod (emptyDir, configMap, secret, projected, hostPath, ...), but
// only PVC-backed volumes carry the `k8s.persistentvolumeclaim.name` resource
// attribute (see https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/82f2e8798b42a13f07d733d073147b6eb279e0e1/receiver/kubeletstatsreceiver/internal/kubelet/volume.go#L25).
// Without this filter, non-PVC volumes pollute the result and collapse into a single empty-string
// group under the default groupBy. v1's PvcsTableListQuery applied the same filter.
func (m *module) newVolumesTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: k8s.volume.available
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.volume.available",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: volumesBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey},
				Disabled: false,
			},
		},
		// Query B: k8s.volume.capacity
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "B",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.volume.capacity",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: volumesBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey},
				Disabled: false,
			},
		},
		// Formula F1: Volume Usage (capacity - available)
		{
			Type: qbtypes.QueryTypeFormula,
			Spec: qbtypes.QueryBuilderFormula{
				Name:       "F1",
				Expression: "B - A",
				Legend:     "Volume Usage",
				Disabled:   false,
			},
		},
		// Query C: k8s.volume.inodes
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "C",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.volume.inodes",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: volumesBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey},
				Disabled: false,
			},
		},
		// Query D: k8s.volume.inodes.free
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "D",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.volume.inodes.free",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: volumesBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey},
				Disabled: false,
			},
		},
		// Query E: k8s.volume.inodes.used
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:   "E",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "k8s.volume.inodes.used",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
						ReduceTo:         qbtypes.ReduceToLast,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: volumesBaseFilterExpr,
				},
				GroupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey},
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
