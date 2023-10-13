package app

import (
	"context"
	"net/http"

	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func (aH *APIHandler) insertIngestionKey(w http.ResponseWriter, r *http.Request) {
	req, err := parseInsertIngestionKeyRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	if err := dao.DB().InsertIngestionKey(context.Background(), req); err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, map[string]string{"data": "ingestion key added successfully"})
}

func (aH *APIHandler) getIngestionKeys(w http.ResponseWriter, r *http.Request) {
	ingestionKeys, err := dao.DB().GetIngestionKeys(context.Background())
	if err != nil {
		RespondError(w, &model.ApiError{Err: err, Typ: model.ErrorInternal}, nil)
		return
	}

	aH.WriteJSON(w, r, ingestionKeys)
}
