package inframetrics

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

var PodsTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			// pod cpu utilization
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["cpu"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
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
					Key:      metricNamesForPods["cpu_request"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "B",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationAvg,
				Disabled:         false,
			},
			// pod cpu limit utilization
			"C": {
				QueryName:  "C",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["cpu_limit"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "C",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationAvg,
				Disabled:         false,
			},
			// pod memory utilization
			"D": {
				QueryName:  "D",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["memory"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
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
					Key:      metricNamesForPods["memory_request"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "E",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationAvg,
				Disabled:         false,
			},
			// pod memory limit utilization
			"F": {
				QueryName:  "F",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["memory_limit"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "F",
				ReduceTo:         v3.ReduceToOperatorAvg,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationAvg,
				Disabled:         false,
			},
			"G": {
				QueryName:  "G",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["restarts"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "G",
				ReduceTo:         v3.ReduceToOperatorSum,
				TimeAggregation:  v3.TimeAggregationAnyLast,
				SpaceAggregation: v3.SpaceAggregationMax,
				Functions:        []v3.Function{{Name: v3.FunctionNameRunningDiff}},
				Disabled:         false,
			},
			// pod phase pending
			"H": {
				QueryName:  "H",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["pod_phase"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "__value",
							},
							Operator: v3.FilterOperatorEqual,
							Value:    1,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "H",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAnyLast,
				SpaceAggregation: v3.SpaceAggregationCount,
				Disabled:         false,
			},
			// pod phase running
			"I": {
				QueryName:  "I",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["pod_phase"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "__value",
							},
							Operator: v3.FilterOperatorEqual,
							Value:    2,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "I",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAnyLast,
				SpaceAggregation: v3.SpaceAggregationCount,
				Disabled:         false,
			},
			// pod phase succeeded
			"J": {
				QueryName:  "J",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["pod_phase"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "__value",
							},
							Operator: v3.FilterOperatorEqual,
							Value:    3,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "J",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAnyLast,
				SpaceAggregation: v3.SpaceAggregationCount,
				Disabled:         false,
			},
			// pod phase failed
			"K": {
				QueryName:  "K",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForPods["pod_phase"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "__value",
							},
							Operator: v3.FilterOperatorEqual,
							Value:    4,
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPodUIDAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "K",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAnyLast,
				SpaceAggregation: v3.SpaceAggregationCount,
				Disabled:         false,
			},
		},
		PanelType: v3.PanelTypeTable,
		QueryType: v3.QueryTypeBuilder,
	},
	Version:      "v4",
	FormatForWeb: true,
}
