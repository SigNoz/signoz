package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	namespaceNameAttrKey = "k8s.namespace.name"
)

var namespaceNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          namespaceNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

// namespacesTableMetricNamesList drives the existence/retention check.
// Includes k8s.pod.phase so the response short-circuits cleanly when a
// cluster doesn't ship the metric — even though phase isn't part of the
// QB composite query (it's queried separately via getPerGroupPodPhaseCounts).
var namespacesTableMetricNamesList = []string{
	"k8s.pod.cpu.usage",
	"k8s.pod.memory.working_set",
	"k8s.pod.phase",
}

var namespaceAttrKeysForMetadata = []string{
	"k8s.namespace.name",
	"k8s.cluster.name",
}

var orderByToNamespacesQueryNames = map[string][]string{
	inframonitoringtypes.NamespacesOrderByCPU:    {"A"},
	inframonitoringtypes.NamespacesOrderByMemory: {"D"},
}

// newNamespacesTableListQuery builds the composite QB v5 request for the namespaces list.
// Pod phase counts are derived separately via getPerGroupPodPhaseCounts (works for both
// list and grouped_list modes), so no phase query is included here.
// Query letters A and D are kept aligned with the v1 implementation.
func (m *module) newNamespacesTableListQuery() *qbtypes.QueryRangeRequest {
	queries := []qbtypes.QueryEnvelope{
		// Query A: CPU usage — sum of pod CPU within the group.
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
				GroupBy:  []qbtypes.GroupByKey{namespaceNameGroupByKey},
				Disabled: false,
			},
		},
		// Query D: Memory working set — sum of pod memory within the group.
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
				GroupBy:  []qbtypes.GroupByKey{namespaceNameGroupByKey},
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
