package api

import (
	"net/http"
	"strconv"

	"go.signoz.io/signoz/ee/query-service/app/db"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (ah *APIHandler) searchTraces(w http.ResponseWriter, r *http.Request) {

	if !ah.CheckFeature(basemodel.SmartTraceDetail) {
		zap.S().Info("SmartTraceDetail feature is not enabled in this plan")
		ah.APIHandler.SearchTraces(w, r)
		return
	}
	traceId, spanId, levelUpInt, levelDownInt, err := baseapp.ParseSearchTracesParams(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading params")
		return
	}
	spanLimit, err := strconv.Atoi(constants.SpanLimitStr)
	if err != nil {
		zap.S().Error("Error during strconv.Atoi() on SPAN_LIMIT env variable: ", err)
		return
	}
	result, err := ah.opts.DataConnector.SearchTraces(r.Context(), traceId, spanId, levelUpInt, levelDownInt, spanLimit, db.SmartTraceAlgorithm)
	if ah.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ah.WriteJSON(w, r, result)

}
