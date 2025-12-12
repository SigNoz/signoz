package implpromote

import (
	"net/http"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type handler struct {
	module promote.Module
}

func NewHandler(module promote.Module) promote.Handler {
	return &handler{module: module}
}

func (h *handler) HandlePromote(w http.ResponseWriter, r *http.Request) {
	// TODO(Nitya): Use in multi tenant setup
	_, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errors.NewInternalf(errors.CodeInternal, "failed to get org id from context"))
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetPromotedAndIndexedPaths(w, r)
		return
	case http.MethodPost:
		h.PromotePaths(w, r)
		return
	default:
		render.Error(w, errors.NewMethodNotAllowedf(errors.CodeMethodNotAllowed, "method not allowed"))
		return
	}
}

func (h *handler) PromotePaths(w http.ResponseWriter, r *http.Request) {
	var req []promotetypes.PromotePath

	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(w, err)
		return
	}

	// Delegate all processing to the reader
	err := h.module.PromoteAndIndexPaths(r.Context(), req...)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, nil)
}

func (h *handler) GetPromotedAndIndexedPaths(w http.ResponseWriter, r *http.Request) {
	response, err := func() ([]promotetypes.PromotePath, error) {
		indexes, err := h.module.ListBodySkipIndexes(r.Context())
		if err != nil {
			return nil, err
		}
		aggr := map[string][]promotetypes.WrappedIndex{}
		for _, index := range indexes {
			path, columnType, err := schemamigrator.UnfoldJSONSubColumnIndexExpr(index.Expression)
			if err != nil {
				return nil, err
			}

			// clean backticks from the path
			path = strings.ReplaceAll(path, "`", "")

			aggr[path] = append(aggr[path], promotetypes.WrappedIndex{
				ColumnType:  columnType,
				Type:        index.Type,
				Granularity: index.Granularity,
			})
		}
		promotedPaths, err := h.module.ListPromotedPaths(r.Context())
		if err != nil {
			return nil, err
		}

		response := []promotetypes.PromotePath{}
		for _, path := range promotedPaths {
			fullPath := telemetrylogs.BodyPromotedColumnPrefix + path
			path = telemetrylogs.BodyJSONStringSearchPrefix + path
			item := promotetypes.PromotePath{
				Path:    path,
				Promote: true,
			}
			indexes, ok := aggr[fullPath]
			if ok {
				item.Indexes = indexes
				delete(aggr, fullPath)
			}
			response = append(response, item)
		}

		// add the paths that are not promoted but have indexes
		for path, indexes := range aggr {
			path := strings.TrimPrefix(path, telemetrylogs.BodyJSONColumnPrefix)
			path = telemetrylogs.BodyJSONStringSearchPrefix + path
			response = append(response, promotetypes.PromotePath{
				Path:    path,
				Indexes: indexes,
			})
		}
		return response, nil
	}()
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, response)
}
