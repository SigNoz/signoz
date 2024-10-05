package inframetrics

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

var HostsTableListQuery = v3.QueryRangeParamsV3{
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
						Key:      "host_name",
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
				Limit:            100,
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
				GroupBy: []v3.AttributeKey{
					{
						Key:      "host_name",
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
				Limit:            100,
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
							Operator: v3.FilterOperatorNotEqual,
							Value:    "used",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "host_name",
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
				Limit:            100,
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
						Key:      "host_name",
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
				Limit:            100,
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
						Key:      "host_name",
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
				Limit:            100,
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
				GroupBy: []v3.AttributeKey{
					{
						Key:      "host_name",
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
				Limit:            100,
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
					Key:      "system_filesystem_usage",
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
							Value:    "used",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "host_name",
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
				Limit:            100,
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"H": {
				QueryName:  "H",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_filesystem_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				GroupBy: []v3.AttributeKey{
					{
						Key:      "host_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "os_type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "H",
				Limit:            100,
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         true,
			},
			"F4": {
				QueryName:  "F4",
				Expression: "G/H",
				Legend:     "Storage Usage (%)",
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}

var ProcessesTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "process_cpu_time",
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
						Key:      "process_pid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_command",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_command_line",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_executable_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "A",
				Limit:            100,
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
				GroupBy:          []v3.AttributeKey{},
				Expression:       "B",
				Limit:            100,
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
					Key:      "process_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "process_pid",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_command",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_command_line",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					{
						Key:      "process_executable_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "C",
				Limit:            100,
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
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "state",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "used",
						},
					},
				},
				GroupBy:          []v3.AttributeKey{},
				Expression:       "D",
				Limit:            100,
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
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}
