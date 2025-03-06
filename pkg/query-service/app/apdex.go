package app

import (
	"errors"
	"net/http"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types/authtypes"
)

func (aH *APIHandler) setApdexSettings(w http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		RespondError(w, &model.ApiError{Err: errors.New("unauthorized"), Typ: model.ErrorUnauthorized}, nil)
		return
	}
	req, err := parseSetApdexScoreRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := dao.DB().SetApdexSettings(r.Context(), claims.OrgID, req); err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, map[string]string{"data": "apdex score updated successfully"})
}

func (aH *APIHandler) getApdexSettings(w http.ResponseWriter, r *http.Request) {
	services := r.URL.Query().Get("services")
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		RespondError(w, &model.ApiError{Err: errors.New("unauthorized"), Typ: model.ErrorUnauthorized}, nil)
		return
	}
	apdexSet, err := dao.DB().GetApdexSettings(r.Context(), claims.OrgID, strings.Split(strings.TrimSpace(services), ","))
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, apdexSet)
}
