package api

import (
	"encoding/json"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

func (aH *APIHandler) getQueryLimits(w http.ResponseWriter, r *http.Request) {
	queryLimits, err := aH.AppDao().GetQueryLimits(r.Context())
	if err != nil {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, queryLimits)
}

func (aH *APIHandler) addQueryLimits(w http.ResponseWriter, r *http.Request) {
	var queryLimits []*model.QueryLimit

	if err := json.NewDecoder(r.Body).Decode(&queryLimits); err != nil {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}, nil)
		return
	}

	err := aH.AppDao().AddQueryLimits(r.Context(), queryLimits)
	if err != nil {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, nil)

}

func (aH *APIHandler) updateQueryLimits(w http.ResponseWriter, r *http.Request) {
	var queryLimits []*model.QueryLimit

	if err := json.NewDecoder(r.Body).Decode(&queryLimits); err != nil {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}, nil)
		return
	}

	err := aH.AppDao().UpdateQueryLimits(r.Context(), queryLimits)
	if err != nil {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, nil)
}
