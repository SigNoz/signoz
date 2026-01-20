package gateway

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const (
	DefaultPage     = 1
	DefaultPageSize = 10
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

	orgID := valuer.MustNewUUID(claims.OrgID)

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

	response, err := handler.gateway.GetIngestionKeys(ctx, orgID, page, perPage)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) SearchIngestionKeys(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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

	response, err := handler.gateway.SearchIngestionKeysByName(ctx, orgID, name, page, perPage)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) CreateIngestionKey(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var req gatewaytypes.PostableIngestionKey
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	response, err := handler.gateway.CreateIngestionKey(ctx, orgID, req.Name, req.Tags, req.ExpiresAt)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) UpdateIngestionKey(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	keyID := mux.Vars(r)["keyId"]
	if keyID == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "keyId is required"))
		return
	}

	var req gatewaytypes.PostableIngestionKey
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	err = handler.gateway.UpdateIngestionKey(ctx, orgID, keyID, req.Name, req.Tags, req.ExpiresAt)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteIngestionKey(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	keyID := mux.Vars(r)["keyId"]
	if keyID == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "keyId is required"))
		return
	}

	err = handler.gateway.DeleteIngestionKey(ctx, orgID, keyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) CreateIngestionKeyLimit(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	keyID := mux.Vars(r)["keyId"]
	if keyID == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "keyId is required"))
		return
	}

	var req gatewaytypes.PostableIngestionKeyLimit
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	response, err := handler.gateway.CreateIngestionKeyLimit(ctx, orgID, keyID, req.Signal, req.Config, req.Tags)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, response)
}

func (handler *handler) UpdateIngestionKeyLimit(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	limitID := mux.Vars(r)["limitId"]
	if limitID == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "limitId is required"))
		return
	}

	var req gatewaytypes.UpdatableIngestionKeyLimit
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	err = handler.gateway.UpdateIngestionKeyLimit(ctx, orgID, limitID, req.Config, req.Tags)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteIngestionKeyLimit(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	limitID := mux.Vars(r)["limitId"]
	if limitID == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "limitId is required"))
		return
	}

	err = handler.gateway.DeleteIngestionKeyLimit(ctx, orgID, limitID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
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
