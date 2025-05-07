package app

import (
	"bytes"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"

	explorer "github.com/SigNoz/signoz/pkg/query-service/app/metricsexplorer"
	"go.uber.org/zap"
)

func (aH *APIHandler) FilterKeysSuggestion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
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
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	params, apiError := explorer.ParseFilterValueSuggestions(r)
	if apiError != nil {
		zap.L().Error("error parsing summary filter values request", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}

	values, apiError := aH.SummaryService.FilterValues(ctx, orgID, params)
	if apiError != nil {
		zap.L().Error("error getting filter values", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, values)
}

func (aH *APIHandler) GetMetricsDetails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	metricName := mux.Vars(r)["metric_name"]
	metricsDetail, apiError := aH.SummaryService.GetMetricsSummary(ctx, orgID, metricName)
	if apiError != nil {
		zap.L().Error("error getting metrics summary error", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, metricsDetail)
}

func (aH *APIHandler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	params, apiErr := explorer.ParseSummaryListMetricsParams(r)
	if apiErr != nil {
		zap.L().Error("error parsing metric list metric summary api request", zap.Error(apiErr.Err))
		RespondError(w, model.BadRequest(apiErr), nil)
		return
	}

	slmr, apiErr := aH.SummaryService.ListMetricsWithSummary(ctx, orgID, params)
	if apiErr != nil {
		zap.L().Error("error in getting list metrics summary", zap.Error(apiErr.Err))
		RespondError(w, apiErr, nil)
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
		zap.L().Error("error parsing tree map metric params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	result, apiError := aH.SummaryService.GetMetricsTreemap(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting tree map data", zap.Error(apiError.Err))
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
		zap.L().Error("error parsing related metric params", zap.Error(apiError.Err))
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

func (aH *APIHandler) GetInspectMetricsData(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()
	params, apiError := explorer.ParseInspectMetricsParams(r)
	if apiError != nil {
		zap.L().Error("error parsing inspect metric params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	result, apiError := aH.SummaryService.GetInspectMetrics(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting inspect metrics data", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, result)

}

func (aH *APIHandler) UpdateMetricsMetadata(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	params, apiError := explorer.ParseUpdateMetricsMetadataParams(r)
	if apiError != nil {
		zap.L().Error("error parsing update metrics metadata params", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	apiError = aH.SummaryService.UpdateMetricsMetadata(ctx, orgID, params)
	if apiError != nil {
		zap.L().Error("error updating metrics metadata", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, nil)

}
