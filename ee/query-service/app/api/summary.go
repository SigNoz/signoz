package api

import (
	"bytes"
	"io"
	"net/http"

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
	keys, apiError := aH.APIHandler.SummaryService.FilterKeys(ctx, params)
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

	values, apiError := aH.APIHandler.SummaryService.FilterValues(ctx, params)
	if apiError != nil {
		zap.L().Error("error getting filter values", zap.Error(apiError.Err))
		RespondError(w, apiError, nil)
		return
	}
	aH.Respond(w, values)
}
