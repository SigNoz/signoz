package metricsexplorer

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/query-service/constants"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/model/metrics_explorer"
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

func ParseInspectMetricsParams(r *http.Request) (*metrics_explorer.InspectMetricsRequest, *model.ApiError) {
	var inspectMetricParams metrics_explorer.InspectMetricsRequest
	if err := json.NewDecoder(r.Body).Decode(&inspectMetricParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}
	if inspectMetricParams.End-inspectMetricParams.Start > constants.InspectMetricsMaxTimeDiff { // half hour only
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("time duration shouldn't be more than 30 mins")}
	}
	return &inspectMetricParams, nil
}

func ParseUpdateMetricsMetadataParams(r *http.Request) (*metrics_explorer.UpdateMetricsMetadataRequest, *model.ApiError) {
	var updateMetricsMetadataReq metrics_explorer.UpdateMetricsMetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&updateMetricsMetadataReq); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}
	updateMetricsMetadataReq.MetricName = mux.Vars(r)["metric_name"]

	switch updateMetricsMetadataReq.MetricType {
	case v3.MetricTypeSum:
		if updateMetricsMetadataReq.Temporality == "" {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("temporality is required when metric type is Sum"),
			}
		}

		if updateMetricsMetadataReq.Temporality != v3.Cumulative && updateMetricsMetadataReq.Temporality != v3.Delta {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("invalid value for temporality"),
			}
		}
	case v3.MetricTypeHistogram:
		if updateMetricsMetadataReq.Temporality == "" {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("temporality is required when metric type is Histogram"),
			}
		}
		if updateMetricsMetadataReq.Temporality != v3.Cumulative && updateMetricsMetadataReq.Temporality != v3.Delta {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("invalid value for temporality"),
			}
		}
	case v3.MetricTypeExponentialHistogram:
		if updateMetricsMetadataReq.Temporality == "" {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("temporality is required when metric type is exponential histogram"),
			}
		}
		if updateMetricsMetadataReq.Temporality != v3.Cumulative && updateMetricsMetadataReq.Temporality != v3.Delta {
			return nil, &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("invalid value for temporality"),
			}
		}

	case v3.MetricTypeGauge:
		updateMetricsMetadataReq.Temporality = v3.Unspecified
	case v3.MetricTypeSummary:
		updateMetricsMetadataReq.Temporality = v3.Cumulative

	default:
		return nil, &model.ApiError{
			Typ: model.ErrorBadData,
			Err: fmt.Errorf("invalid metric type"),
		}
	}
	return &updateMetricsMetadataReq, nil
}
