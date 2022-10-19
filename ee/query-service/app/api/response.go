package api

import (
	"net/http"

	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

func RespondError(w http.ResponseWriter, apiErr basemodel.BaseApiError, data interface{}) {
	baseapp.RespondError(w, apiErr, data)
}
