package api

import (
	"net/http"

	baseapp "go.signoz.io/query-service/app"
	basemodel "go.signoz.io/query-service/model"
)

func RespondError(w http.ResponseWriter, apiErr basemodel.BaseApiError, data interface{}) {
	baseapp.RespondError(w, apiErr, data)
}
