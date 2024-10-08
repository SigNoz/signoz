package api

import (
	"encoding/json"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/app/db"
	"go.signoz.io/signoz/ee/query-service/model"
	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (ah *APIHandler) searchTraces(w http.ResponseWriter, r *http.Request) {

	if !ah.CheckFeature(basemodel.SmartTraceDetail) {
		zap.L().Info("SmartTraceDetail feature is not enabled in this plan")
		ah.APIHandler.SearchTraces(w, r)
		return
	}
	searchTracesParams, err := baseapp.ParseSearchTracesParams(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading params")
		return
	}

	req := &basemodel.SearchTraceRequest{}
	err = json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	result, err := ah.opts.DataConnector.SearchTraces(r.Context(), searchTracesParams, db.SmartTraceAlgorithm, req)
	if ah.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ah.WriteJSON(w, r, result)

}
