package app

import (
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

func (aH *APIHandler) setApdexSettings(w http.ResponseWriter, r *http.Request) {
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
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
	claims, errv2 := authtypes.ClaimsFromContext(r.Context())
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}
	apdexSet, err := dao.DB().GetApdexSettings(r.Context(), claims.OrgID, strings.Split(strings.TrimSpace(services), ","))
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, apdexSet)
}
