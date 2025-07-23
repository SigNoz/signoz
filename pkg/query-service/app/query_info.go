package app

import (
	"encoding/json"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// TODO(srikanthccv): Move to the querier layer
type QueryInfoResult struct {
	Version               string               `json:"version"`
	LogsUsed              bool                 `json:"logs_used,omitempty"`
	MetricsUsed           bool                 `json:"metrics_used,omitempty"`
	TracesUsed            bool                 `json:"traces_used,omitempty"`
	FilterApplied         bool                 `json:"filter_applied,omitempty"`
	GroupByApplied        bool                 `json:"group_by_applied,omitempty"`
	AggregateOperator     v3.AggregateOperator `json:"aggregate_operator,omitempty"`
	AggregateAttributeKey string               `json:"aggregate_attribute_key,omitempty"`
	QueryType             v3.QueryType         `json:"query_type,omitempty"`
	PanelType             v3.PanelType         `json:"panel_type,omitempty"`
	NumberOfQueries       int                  `json:"number_of_queries,omitempty"`
}

func NewQueryInfoResult(postData *v3.QueryRangeParamsV3, version string) QueryInfoResult {
	queryInfoResult := QueryInfoResult{
		Version: version,
	}

	if postData == nil {
		return queryInfoResult
	}

	if postData.CompositeQuery == nil {
		return queryInfoResult
	}

	queryInfoResult.PanelType = postData.CompositeQuery.PanelType
	queryInfoResult.QueryType = postData.CompositeQuery.QueryType

	if postData.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		queryInfoResult.NumberOfQueries = len(postData.CompositeQuery.BuilderQueries)
		for _, query := range postData.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceLogs {
				queryInfoResult.LogsUsed = true
			} else if query.DataSource == v3.DataSourceMetrics {
				queryInfoResult.MetricsUsed = true

			} else if query.DataSource == v3.DataSourceTraces {
				queryInfoResult.TracesUsed = true
			}
			if query.Filters != nil && len(query.Filters.Items) > 0 {
				queryInfoResult.FilterApplied = true
			}
			if query.GroupBy != nil && len(query.GroupBy) > 0 {
				queryInfoResult.GroupByApplied = true
			}
			queryInfoResult.AggregateOperator = query.AggregateOperator
			if len(query.AggregateAttribute.Key) > 0 && !strings.Contains(query.AggregateAttribute.Key, "signoz_") {
				queryInfoResult.AggregateAttributeKey = query.AggregateAttribute.Key
			}
		}
	} else if postData.CompositeQuery.QueryType == v3.QueryTypePromQL {
		for _, query := range postData.CompositeQuery.PromQueries {
			if !strings.Contains(query.Query, "signoz_") && len(query.Query) > 0 {
				queryInfoResult.MetricsUsed = true
			}
		}
	} else if postData.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
		for _, query := range postData.CompositeQuery.ClickHouseQueries {
			if strings.Contains(query.Query, "signoz_metrics") && len(query.Query) > 0 {
				queryInfoResult.MetricsUsed = true
			}
			if strings.Contains(query.Query, "signoz_logs") && len(query.Query) > 0 {
				queryInfoResult.LogsUsed = true
			}
			if strings.Contains(query.Query, "signoz_traces") && len(query.Query) > 0 {
				queryInfoResult.TracesUsed = true
			}
		}
	}

	return queryInfoResult
}

func (queryInfoResult QueryInfoResult) ToMap() map[string]interface{} {
	marshalled, err := json.Marshal(queryInfoResult)
	if err != nil {
		return nil
	}

	var result map[string]interface{}
	err = json.Unmarshal(marshalled, &result)
	if err != nil {
		return nil
	}

	return result
}
