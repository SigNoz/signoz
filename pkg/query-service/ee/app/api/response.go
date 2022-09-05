package api

import (
	baseapp "go.signoz.io/query-service/app"
	"go.signoz.io/query-service/ee/model"
	"net/http"
)

func RespondError(w http.ResponseWriter, apiErr *model.ApiError, data interface{}) {
	baseapp.RespondError(w, &apiErr.ApiError, data)
}
