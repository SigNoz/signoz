package inframetrics

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

var K8STableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_cpu_time",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "state",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "idle",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "A",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"B": {
				QueryName:  "B",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_cpu_time",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "B",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"F1": {
				QueryName:  "F1",
				Expression: "A/B",
				Legend:     "CPU Usage (%)",
			},
			"C": {
				QueryName:  "C",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "state",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorIn,
							Value:    []string{"used", "cached"},
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "C",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"D": {
				QueryName:  "D",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "D",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"F2": {
				QueryName:  "F2",
				Expression: "C/D",
				Legend:     "Memory Usage (%)",
			},
			"E": {
				QueryName:  "E",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_cpu_time",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "state",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "wait",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "E",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"F": {
				QueryName:  "F",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_cpu_time",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "F",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"F3": {
				QueryName:  "F3",
				Expression: "E/F",
				Legend:     "CPU Wait Time (%)",
			},
			"G": {
				QueryName:  "G",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_cpu_load_average_15m",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "G",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Legend:           "CPU Load Average (15m)",
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}

var PodsTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			// pod cpu utilization
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_cpu_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "A",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// pod cpu request utilization
			"B": {
				QueryName:  "B",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_cpu_request_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "B",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// pod cpu limit utilization
			"C": {
				QueryName:  "C",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_cpu_limit_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "C",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// pod memory utilization
			"D": {
				QueryName:  "D",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "D",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// pod memory request utilization
			"E": {
				QueryName:  "E",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_memory_request_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "E",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// pod memory limit utilization
			"F": {
				QueryName:  "F",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_pod_memory_limit_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_pod_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "F",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}

var NodesTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			// node cpu utilization
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_node_cpu_utilization",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "A",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// node memory utilization
			"B": {
				QueryName:  "B",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "k8s_node_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "k8s_node_uid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "B",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}
