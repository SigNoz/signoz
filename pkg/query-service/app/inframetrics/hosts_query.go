package inframetrics

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

var HostsTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForHosts["cpu"],
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
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
					Key:      metricNamesForHosts["cpu"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
			},
			"C": {
				QueryName:  "C",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForHosts["memory"],
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
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
					Key:      metricNamesForHosts["memory"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
			},
			"E": {
				QueryName:  "E",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForHosts["wait"],
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
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
					Key:      metricNamesForHosts["wait"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
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
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
			},
			"G": {
				QueryName:  "G",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForHosts["load15"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      hostNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotContains,
							Value:    agentNameToIgnore,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      hostNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "G",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
				Legend:           "CPU Load Average (15m)",
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}
