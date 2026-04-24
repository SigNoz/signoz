package implinframonitoring

import (
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	hostNameAttrKey = "host.name"
)

// Helper group-by key used across all queries.
var hostNameGroupByKey = qbtypes.GroupByKey{
	TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		Name:          hostNameAttrKey,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
}

var hostsTableMetricNamesList = []string{
	"system.cpu.time",
	"system.memory.usage",
	"system.cpu.load_average.15m",
	"system.filesystem.usage",
}

var hostAttrKeysForMetadata = []string{
	"os.type",
}

// orderByToHostsQueryNames maps the orderBy column to the query/formula names
// from HostsTableListQuery used for ranking host groups.
var orderByToHostsQueryNames = map[string][]string{
	inframonitoringtypes.HostsOrderByCPU:       {"A", "B", "F1"},
	inframonitoringtypes.HostsOrderByMemory:    {"C", "D", "F2"},
	inframonitoringtypes.HostsOrderByWait:      {"E", "F", "F3"},
	inframonitoringtypes.HostsOrderByDiskUsage: {"H", "I", "F4"},
	inframonitoringtypes.HostsOrderByLoad15:    {"G"},
}

// newListHostsQuery constructs the base QueryRangeRequest with all the queries for the hosts table.
// This is kept in this file because the queries themselves do not change based on the request parameters
// only the filters, group bys, and order bys change, which are applied in buildFullQueryRequest.
func (m *module) newListHostsQuery() *qbtypes.QueryRangeRequest {
	return &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				// Query A: CPU usage logic (non-idle)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state != 'idle'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query B: CPU usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F1: CPU Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F1",
						Expression: "A/B",
						Legend:     "CPU Usage (%)",
						Disabled:   false,
					},
				},
				// Query C: Memory usage (state = used)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "C",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'used'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query D: Memory usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "D",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.memory.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F2: Memory Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F2",
						Expression: "C/D",
						Legend:     "Memory Usage (%)",
						Disabled:   false,
					},
				},
				// Query E: CPU Wait time (state = wait)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "E",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'wait'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query F: CPU time (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "F",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.time",
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F3: CPU Wait Time (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F3",
						Expression: "E/F",
						Legend:     "CPU Wait Time (%)",
						Disabled:   false,
					},
				},
				// Query G: Load15
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "G",
						Signal: telemetrytypes.SignalMetrics,
						Legend: "CPU Load Average (15m)",
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.cpu.load_average.15m",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: false,
					},
				},
				// Query H: Filesystem Usage (state = used)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "H",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.filesystem.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						Filter: &qbtypes.Filter{
							Expression: "state = 'used'",
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Query I: Filesystem Usage (all states)
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "I",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "system.filesystem.usage",
								TimeAggregation:  metrictypes.TimeAggregationAvg,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								ReduceTo:         qbtypes.ReduceToAvg,
							},
						},
						GroupBy:  []qbtypes.GroupByKey{hostNameGroupByKey},
						Disabled: true,
					},
				},
				// Formula F4: Disk Usage (%)
				{
					Type: qbtypes.QueryTypeFormula,
					Spec: qbtypes.QueryBuilderFormula{
						Name:       "F4",
						Expression: "H/I",
						Legend:     "Disk Usage (%)",
						Disabled:   false,
					},
				},
			},
		},
	}
}
