package quickfilter

import (
	"encoding/json"
	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"net/http"
	"strings"
)

type API interface {
	GetQuickFilters(http.ResponseWriter, *http.Request)
	UpdateQuickFilters(http.ResponseWriter, *http.Request)
	GetSignalFilters(http.ResponseWriter, *http.Request)
}

type quickFiltersAPI struct {
	usecase Usecase
}

func NewAPI(usecase Usecase) API {
	return &quickFiltersAPI{usecase: usecase}
}

func (q *quickFiltersAPI) GetQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}

	filters, err := q.usecase.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, filters)
}

func (q *quickFiltersAPI) UpdateQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}

	var req quickfiltertypes.UpdatableQuickFilters
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	err = q.usecase.UpdateQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), req.Signal, req.Filters)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (q *quickFiltersAPI) GetSignalFilters(rw http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}

	signal := mux.Vars(r)["signal"]
	if !quickfiltertypes.IsValidSignal(strings.ToLower(signal)) {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "invalid signal: %s", signal))
		return
	}

	filters, err := q.usecase.GetSignalFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), quickfiltertypes.SignalFromString(signal))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, filters)
}
