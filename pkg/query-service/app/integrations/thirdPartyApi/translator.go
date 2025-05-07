package thirdPartyApi

import (
	"net"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

const (
	urlPathKey    = "http.url"
	serverNameKey = "net.peer.name"
)

var defaultStepInterval int64 = 60

func FilterResponse(results []*v3.Result) []*v3.Result {
	filteredResults := make([]*v3.Result, 0, len(results))

	for _, res := range results {
		if res.Table == nil {
			continue
		}
		filteredRows := make([]*v3.TableRow, 0, len(res.Table.Rows))
		for _, row := range res.Table.Rows {
			if row.Data != nil {
				if domainVal, ok := row.Data[serverNameKey]; ok {
					if domainStr, ok := domainVal.(string); ok {
						if net.ParseIP(domainStr) != nil {
							continue
						}
					}
				}
			}
			filteredRows = append(filteredRows, row)
		}
		res.Table.Rows = filteredRows

		filteredResults = append(filteredResults, res)
	}

	return filteredResults
}

func getFilterSet(existingFilters []v3.FilterItem, apiFilters v3.FilterSet) []v3.FilterItem {
	if len(apiFilters.Items) != 0 {
		existingFilters = append(existingFilters, apiFilters.Items...)
	}
	return existingFilters
}

func getGroupBy(existingGroupBy []v3.AttributeKey, apiGroupBy []v3.AttributeKey) []v3.AttributeKey {
	if len(apiGroupBy) != 0 {
		existingGroupBy = append(existingGroupBy, apiGroupBy...)
	}
	return existingGroupBy
}

func BuildDomainList(thirdPartyApis *ThirdPartyApis) (*v3.QueryRangeParamsV3, error) {

	unixMilliStart := thirdPartyApis.Start
	unixMilliEnd := thirdPartyApis.End

	builderQueries := make(map[string]*v3.BuilderQuery)

	builderQueries["endpoints"] = &v3.BuilderQuery{
		QueryName:         "endpoints",
		Legend:            "endpoints",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorCountDistinct,
		AggregateAttribute: v3.AttributeKey{
			Key:      urlPathKey,
			DataType: v3.AttributeKeyDataTypeString,
			Type:     v3.AttributeKeyTypeTag,
		},
		TimeAggregation:  v3.TimeAggregationCountDistinct,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "endpoints",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      serverNameKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["lastseen"] = &v3.BuilderQuery{
		QueryName:         "lastseen",
		Legend:            "lastseen",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorMax,
		AggregateAttribute: v3.AttributeKey{
			Key: "timestamp",
		},
		TimeAggregation:  v3.TimeAggregationMax,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "lastseen",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      serverNameKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["rps"] = &v3.BuilderQuery{
		QueryName:         "rps",
		Legend:            "rps",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorRate,
		AggregateAttribute: v3.AttributeKey{
			Key: "",
		},
		TimeAggregation:  v3.TimeAggregationRate,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "rps",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      serverNameKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["error"] = &v3.BuilderQuery{
		QueryName:         "error",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorCount,
		AggregateAttribute: v3.AttributeKey{
			Key:      "span_id",
			DataType: v3.AttributeKeyDataTypeString,
			IsColumn: true,
		},
		TimeAggregation:  v3.TimeAggregationCount,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "has_error",
						DataType: v3.AttributeKeyDataTypeBool,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "true",
				},
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "error",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      serverNameKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		Disabled:  true,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["total_span"] = &v3.BuilderQuery{
		QueryName:         "total_span",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorCount,
		AggregateAttribute: v3.AttributeKey{
			Key:      "span_id",
			DataType: v3.AttributeKeyDataTypeString,
			IsColumn: true,
		},
		TimeAggregation:  v3.TimeAggregationCount,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "http.url",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "total_span",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      "net.peer.name",
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		Disabled:  true,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["p99"] = &v3.BuilderQuery{
		QueryName:         "p99",
		Legend:            "p99",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorP99,
		AggregateAttribute: v3.AttributeKey{
			Key:      "duration_nano",
			DataType: v3.AttributeKeyDataTypeFloat64,
			IsColumn: true,
		},
		TimeAggregation:  "p99",
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "p99",
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      serverNameKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		ReduceTo:  v3.ReduceToOperatorAvg,
		ShiftBy:   0,
		IsAnomaly: false,
	}

	builderQueries["error_rate"] = &v3.BuilderQuery{
		QueryName:  "error_rate",
		Expression: "(error/total_span)*100",
		Legend:     "error_rate",
		Disabled:   false,
		ShiftBy:    0,
		IsAnomaly:  false,
	}

	compositeQuery := &v3.CompositeQuery{
		QueryType:      v3.QueryTypeBuilder,
		PanelType:      v3.PanelTypeTable,
		FillGaps:       false,
		BuilderQueries: builderQueries,
	}

	queryRangeParams := &v3.QueryRangeParamsV3{
		Start:          unixMilliStart,
		End:            unixMilliEnd,
		Step:           defaultStepInterval,
		CompositeQuery: compositeQuery,
		Version:        "v4",
		FormatForWeb:   true,
	}

	return queryRangeParams, nil
}

func BuildDomainInfo(thirdPartyApis *ThirdPartyApis) (*v3.QueryRangeParamsV3, error) {
	unixMilliStart := thirdPartyApis.Start
	unixMilliEnd := thirdPartyApis.End

	builderQueries := make(map[string]*v3.BuilderQuery)

	builderQueries["endpoints"] = &v3.BuilderQuery{
		QueryName:         "endpoints",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorCount,
		AggregateAttribute: v3.AttributeKey{
			Key:      urlPathKey,
			DataType: v3.AttributeKeyDataTypeString,
			Type:     v3.AttributeKeyTypeTag,
		},
		TimeAggregation:  v3.TimeAggregationRate,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "endpoints",
		Disabled:   false,
		GroupBy: getGroupBy([]v3.AttributeKey{
			{
				Key:      urlPathKey,
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		}, thirdPartyApis.GroupBy),
		Legend:   "",
		ReduceTo: v3.ReduceToOperatorAvg,
	}

	builderQueries["p99"] = &v3.BuilderQuery{
		QueryName:         "p99",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorP99,
		AggregateAttribute: v3.AttributeKey{
			Key:      "duration_nano",
			DataType: v3.AttributeKeyDataTypeFloat64,
			IsColumn: true,
		},
		TimeAggregation:  "p99",
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "p99",
		Disabled:   false,
		Having:     nil,
		GroupBy:    getGroupBy([]v3.AttributeKey{}, thirdPartyApis.GroupBy),
		Legend:     "",
		ReduceTo:   v3.ReduceToOperatorAvg,
	}

	builderQueries["error_rate"] = &v3.BuilderQuery{
		QueryName:         "error_rate",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorRate,
		AggregateAttribute: v3.AttributeKey{
			Key: "",
		},
		TimeAggregation:  v3.TimeAggregationRate,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "error_rate",
		Disabled:   false,
		GroupBy:    getGroupBy([]v3.AttributeKey{}, thirdPartyApis.GroupBy),
		Legend:     "",
		ReduceTo:   v3.ReduceToOperatorAvg,
	}

	builderQueries["lastseen"] = &v3.BuilderQuery{
		QueryName:         "lastseen",
		DataSource:        v3.DataSourceTraces,
		StepInterval:      defaultStepInterval,
		AggregateOperator: v3.AggregateOperatorMax,
		AggregateAttribute: v3.AttributeKey{
			Key: "timestamp",
		},
		TimeAggregation:  v3.TimeAggregationMax,
		SpaceAggregation: v3.SpaceAggregationSum,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: getFilterSet([]v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      urlPathKey,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: false,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: v3.FilterOperatorExists,
					Value:    "",
				},
				{
					Key: v3.AttributeKey{
						Key:      "kind_string",
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Operator: "=",
					Value:    "Client",
				},
			}, thirdPartyApis.Filters),
		},
		Expression: "lastseen",
		Disabled:   false,
		Having:     nil,
		OrderBy:    nil,
		GroupBy:    getGroupBy([]v3.AttributeKey{}, thirdPartyApis.GroupBy),
		Legend:     "",
		ReduceTo:   v3.ReduceToOperatorAvg,
	}

	compositeQuery := &v3.CompositeQuery{
		QueryType:      v3.QueryTypeBuilder,
		PanelType:      v3.PanelTypeTable,
		FillGaps:       false,
		BuilderQueries: builderQueries,
	}

	queryRangeParams := &v3.QueryRangeParamsV3{
		Start:          unixMilliStart,
		End:            unixMilliEnd,
		Step:           defaultStepInterval,
		CompositeQuery: compositeQuery,
		Version:        "v4",
		FormatForWeb:   true,
	}

	return queryRangeParams, nil
}
