package api

import (
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"
)

func (ah *APIHandler) searchTraces(w http.ResponseWriter, r *http.Request) {

	if !ah.CheckFeature(model.SmartTraceDetail) {
		zap.S().Info("SmartTraceDetail feature is not enabled in this plan")
		ah.APIHandler.SearchTraces(w, r)
		return
	}
	vars := mux.Vars(r)
	traceId := vars["traceId"]
	spanId := r.URL.Query().Get("spanId")
	levelUp := r.URL.Query().Get("levelUp")
	levelDown := r.URL.Query().Get("levelDown")
	if levelUp == "" || levelUp == "null" {
		levelUp = "0"
	}
	if levelDown == "" || levelDown == "null" {
		levelDown = "0"
	}

	levelUpInt, err := strconv.Atoi(levelUp)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading levelUp")
		return
	}
	levelDownInt, err := strconv.Atoi(levelDown)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: err}, "Error reading levelDown")
		return
	}

	result, err := ah.opts.DataConnector.SearchTraces(r.Context(), traceId, spanId, levelUpInt, levelDownInt)
	if ah.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	ah.WriteJSON(w, r, result)

}
