package querier

import (
	"encoding/json"
	"net/http"
	"runtime/debug"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type API struct {
	set     factory.ProviderSettings
	querier Querier
}

func NewAPI(set factory.ProviderSettings, querier Querier) *API {
	return &API{set: set, querier: querier}
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

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			queryJSON, _ := json.Marshal(queryRangeRequest)

			a.set.Logger.ErrorContext(ctx, "panic in QueryRange",
				"error", r,
				"user", claims.UserID,
				"payload", string(queryJSON),
				"stacktrace", stackTrace,
			)

			render.Error(rw, errors.NewInternalf(
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			))
		}
	}()

	// Validate the query request
	if err := queryRangeRequest.Validate(); err != nil {
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
