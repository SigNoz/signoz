package metricsexplorer

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
)

func ParseFilterKeySuggestions(r *http.Request) (*metrics_explorer.FilterKeyRequest, *model.ApiError) {

	searchText := r.URL.Query().Get("searchText")
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	return &metrics_explorer.FilterKeyRequest{Limit: limit, SearchText: searchText}, nil
}

func ParseFilterValueSuggestions(r *http.Request) (*metrics_explorer.FilterValueRequest, *model.ApiError) {
	var filterValueRequest metrics_explorer.FilterValueRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&filterValueRequest); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	return &filterValueRequest, nil
}

func ParseSummaryListMetricsParams(r *http.Request) (*metrics_explorer.SummaryListMetricsRequest, *model.ApiError) {
	var listMetricsParams *metrics_explorer.SummaryListMetricsRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&listMetricsParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	if listMetricsParams.OrderBy.ColumnName == "" || listMetricsParams.OrderBy.Order == "" {
		listMetricsParams.OrderBy.ColumnName = "timeseries" // DEFAULT ORDER BY
		listMetricsParams.OrderBy.Order = v3.DirectionDesc
	}

	if listMetricsParams.Limit == 0 {
		listMetricsParams.Limit = 10 // DEFAULT LIMIT
	}

	return listMetricsParams, nil
}

func ParseTreeMapMetricsParams(r *http.Request) (*metrics_explorer.TreeMapMetricsRequest, *model.ApiError) {
	var treeMapMetricParams *metrics_explorer.TreeMapMetricsRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&treeMapMetricParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	if treeMapMetricParams.Limit == 0 {
		treeMapMetricParams.Limit = 10
	}

	return treeMapMetricParams, nil
}

func ParseRelatedMetricsParams(r *http.Request) (*metrics_explorer.RelatedMetricsRequest, *model.ApiError) {
	var relatedMetricParams metrics_explorer.RelatedMetricsRequest
	if err := json.NewDecoder(r.Body).Decode(&relatedMetricParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}
	return &relatedMetricParams, nil
}
