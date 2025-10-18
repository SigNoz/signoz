package implspanpercentile

import (
	"encoding/json"
	"net/http"

	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	preferencetypes "github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module           spanpercentile.Module
	preferenceModule preference.Module
}

func NewHandler(module spanpercentile.Module, preferenceModule preference.Module) spanpercentile.Handler {
	return &handler{
		module:           module,
		preferenceModule: preferenceModule,
	}
}

func (h *handler) GetSpanPercentileDetails(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	spanPercentileRequest, err := parseSpanPercentileRequestBody(r)
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	result, err := h.module.GetSpanPercentileDetails(r.Context(), valuer.MustNewUUID(claims.OrgID), spanPercentileRequest)
	if err != nil {
		apiErrObj := errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error())
		render.Error(w, apiErrObj)
		return
	}

	render.Success(w, http.StatusOK, result)
}

func parseSpanPercentileRequestBody(r *http.Request) (*spanpercentiletypes.SpanPercentileRequest, error) {
	req := new(spanpercentiletypes.SpanPercentileRequest)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return nil, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "cannot parse the request body: %v", err)
	}

	if err := req.Validate(); err != nil {
		return nil, err
	}

	return req, nil
}

func (h *handler) GetAdditionalResourceAttributes(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errorsV2.New(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, err.Error()))
		return
	}

	userID := valuer.MustNewUUID(claims.UserID)

	pref, err := h.preferenceModule.GetByUser(
		r.Context(),
		userID,
		preferencetypes.NameSpanPercentileAdditionalResourceAttributes,
	)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, pref.Value)
}

