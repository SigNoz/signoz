package querier

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type API struct {
	querier Querier
}

func NewAPI(querier Querier) *API {
	return &API{querier: querier}
}

func (a *API) QueryRange(rw http.ResponseWriter, req *http.Request) {
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

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResponse, err := a.querier.QueryRange(ctx, orgID, &queryRangeRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, queryRangeResponse)
}
