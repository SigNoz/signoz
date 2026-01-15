package gateway

import (
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	gateway Gateway
}

func NewHandler(gateway Gateway) Handler {
	return &handler{
		gateway: gateway,
	}
}

func (handler *handler) GetIngestionKeys(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	pageString := r.URL.Query().Get("page")
	perPageString := r.URL.Query().Get("per_page")

	page, err := parseIntWithDefaultValue(pageString, DefaultPage)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "page must be a valid integer"))
		return
	}

	perPage, err := parseIntWithDefaultValue(perPageString, DefaultPageSize)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "per_page must be a valid integer"))
		return
	}

	keys, err := handler.gateway.GetIngestionKeys(ctx, orgID, page, perPage)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to get ingestion keys from gateway"))
		return
	}

	render.Success(rw, http.StatusOK, keys)
}

func (handler *handler) SearchIngestionKeys(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	pageString := r.URL.Query().Get("page")
	perPageString := r.URL.Query().Get("per_page")
	name := r.URL.Query().Get("name")

	page, err := parseIntWithDefaultValue(pageString, DefaultPage)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "page must be a valid integer"))
		return
	}

	perPage, err := parseIntWithDefaultValue(perPageString, DefaultPageSize)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "per_page must be a valid integer"))
		return
	}

	keys, err := handler.gateway.SearchIngestionKeysByName(ctx, orgID, name, page, perPage)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to search ingestion keys from gateway"))
		return
	}

	render.Success(rw, http.StatusOK, keys)
}

func parseIntWithDefaultValue(value string, defaultValue int) (int, error) {
	if value == "" {
		return defaultValue, nil
	}

	result, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}

	return result, nil
}
