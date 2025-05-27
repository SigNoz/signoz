package implqueryrange

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/queryrange"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type handler struct {
	module queryrange.Module
}

func NewHandler(module queryrange.Module) queryrange.Handler {
	return &handler{module: module}
}

func (handler *handler) QueryRange(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var queryRangeRequest qbtypes.QueryRangeRequest
	if err := json.NewDecoder(req.Body).Decode(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResponse, err := handler.module.QueryRange(ctx, claims.OrgID, &queryRangeRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, queryRangeResponse)
}
