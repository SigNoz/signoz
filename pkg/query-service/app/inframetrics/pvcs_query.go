package inframetrics

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

var PvcsTableListQuery = v3.QueryRangeParamsV3{
	CompositeQuery: &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			// k8s.volume.available
			"A": {
				QueryName:  "A",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForVolumes["available"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      k8sPersistentVolumeClaimNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPersistentVolumeClaimNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "A",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// k8s.volume.capacity
			"B": {
				QueryName:  "B",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForVolumes["capacity"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      k8sPersistentVolumeClaimNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPersistentVolumeClaimNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "B",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			"F1": {
				QueryName:  "F1",
				DataSource: v3.DataSourceMetrics,
				Expression: "B - A",
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				ReduceTo: v3.ReduceToOperatorLast,
			},
			// k8s.volume.inodes
			"C": {
				QueryName:  "C",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForVolumes["inodes"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      k8sPersistentVolumeClaimNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPersistentVolumeClaimNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "C",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// k8s.volume.inodes_free
			"D": {
				QueryName:  "D",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForVolumes["inodes_free"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      k8sPersistentVolumeClaimNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPersistentVolumeClaimNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "D",
				ReduceTo:         v3.ReduceToOperatorLast,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			// k8s.volume.inodes_used
			"E": {
				QueryName:  "E",
				DataSource: v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      metricNamesForVolumes["inodes_used"],
					DataType: v3.AttributeKeyDataTypeFloat64,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      k8sPersistentVolumeClaimNameAttrKey,
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeResource,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "",
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      k8sPersistentVolumeClaimNameAttrKey,
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
				},
				Expression:       "E",
				ReduceTo:         v3.ReduceToOperatorLast,
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
