package app

import (
	"context"
	"net/http"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func (aH *APIHandler) setApdexSettings(w http.ResponseWriter, r *http.Request) {
	req, err := parseSetApdexScoreRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := dao.DB().SetApdexSettings(context.Background(), req); err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, map[string]string{"data": "apdex score updated successfully"})
}

func (aH *APIHandler) getApdexSettings(w http.ResponseWriter, r *http.Request) {
	services := r.URL.Query().Get("services")
	apdexSet, err := dao.DB().GetApdexSettings(context.Background(), strings.Split(strings.TrimSpace(services), ","))
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, apdexSet)
}
