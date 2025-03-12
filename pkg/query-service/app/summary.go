package app

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/query-service/model"

	explorer "go.signoz.io/signoz/pkg/query-service/app/metricsexplorer"
	"go.uber.org/zap"
)

func (aH *APIHandler) FilterKeysSuggestion(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseFilterKeySuggestions(r)
	if apiError != nil {
		zap.L().Error("error parsing summary filter keys request", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	keys, apiError := aH.SummaryService.FilterKeys(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting filter keys", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, keys)
}

func (aH *APIHandler) FilterValuesSuggestion(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseFilterValueSuggestions(r)
	if apiError != nil {
		zap.L().Error("error parsing summary filter values request", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}

	values, apiError := aH.SummaryService.FilterValues(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting filter values", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, values)
}

func (aH *APIHandler) GetMetricsDetails(w http.ResponseWriter, r *http.Request) {
	metricName := mux.Vars(r)["metric_name"]
	ctx := r.Context()
	metricsDetail, apiError := aH.SummaryService.GetMetricsSummary(ctx, metricName)
	if apiError != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, metricsDetail)
}

func (aH *APIHandler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseSummaryListMetricsParams(r)
	if apiError != nil {
		zap.L().Error("error parsing metric list metric summary api request", zap.Error(apiError.Err))
		RespondError(w, model.BadRequest(apiError), nil)
		return
	}

	slmr, apiErr := aH.SummaryService.ListMetricsWithSummary(ctx, params)
	if apiErr != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErr.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, slmr)
}

func (aH *APIHandler) GetTreeMap(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseTreeMapMetricsParams(r)
	if apiError != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	result, apiError := aH.SummaryService.GetMetricsTreemap(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting heatmap data", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, result)

}

func (aH *APIHandler) GetRelatedMetrics(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseRelatedMetricsParams(r)
	if apiError != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	result, apiError := aH.SummaryService.GetRelatedMetrics(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting related metrics", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, result)

}
