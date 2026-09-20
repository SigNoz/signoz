package aivision

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	Traces(http.ResponseWriter, *http.Request)
	TraceFacets(http.ResponseWriter, *http.Request)
	TraceIOBatch(http.ResponseWriter, *http.Request)
	TraceUsageBatch(http.ResponseWriter, *http.Request)
	SpanBatch(http.ResponseWriter, *http.Request)
	TraceDetail(http.ResponseWriter, *http.Request)
	Sessions(http.ResponseWriter, *http.Request)
	SessionIOBatch(http.ResponseWriter, *http.Request)
	SessionUsageBatch(http.ResponseWriter, *http.Request)
	SessionDetail(http.ResponseWriter, *http.Request)
	EventsMetadata(http.ResponseWriter, *http.Request)
	EventsList(http.ResponseWriter, *http.Request)
	EventsFacets(http.ResponseWriter, *http.Request)
	Dashboard(http.ResponseWriter, *http.Request)
}
type handler struct {
	backend *oceanBaseStore
	cfg     config
	logger  *slog.Logger
}

func NewHandler(module *Module) Handler {
	return &handler{backend: module.store, cfg: module.store.cfg, logger: module.logger}
}

// The main authentication middleware owns organization selection. Neither
// client headers/body nor a profile-wide default may override the claims.
func (h *handler) organization(rw http.ResponseWriter, r *http.Request) (string, bool) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return "", false
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil || orgID.IsZero() {
		render.Error(rw, errors.NewUnauthenticatedf(errors.CodeUnauthenticated, "invalid organization claims"))
		return "", false
	}
	if !h.cfg.Enabled {
		render.Error(rw, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "AI Vision domain queries require the OceanBase profile"))
		return "", false
	}
	return orgID.String(), true
}

func (h *handler) Traces(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.URL.Path != "/api/v1/ai-vision/traces" {
		http.NotFound(response, request)
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	params, err := h.nativeParams(request)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.listTraces(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) TraceFacets(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	params, err := h.nativeParams(request)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.listTraceFacets(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"data": result, "meta": map[string]any{"supported": true}})
}

func (h *handler) TraceIOBatch(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	payload, params, ok := h.decodeNativeBatch(response, request)
	if !ok {
		return
	}
	params.TraceIDs = uniqueNativeIDs(payload.TraceIDs)
	if len(params.TraceIDs) == 0 || len(params.TraceIDs) > 100 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "trace_ids requires 1 to 100 items")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getTraceIOBatch(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) TraceUsageBatch(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	payload, params, ok := h.decodeNativeBatch(response, request)
	if !ok {
		return
	}
	params.TraceIDs = uniqueNativeIDs(payload.TraceIDs)
	if len(params.TraceIDs) == 0 || len(params.TraceIDs) > 100 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "trace_ids requires 1 to 100 items")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getTraceUsageBatch(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) SpanBatch(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	payload, params, ok := h.decodeNativeBatch(response, request)
	if !ok {
		return
	}
	params.TraceID = strings.TrimSpace(payload.TraceID)
	params.SpanIDs = uniqueNativeIDs(payload.SpanIDs)
	if params.TraceID == "" {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "trace_id must not be empty")
		return
	}
	if len(params.SpanIDs) == 0 || len(params.SpanIDs) > 200 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "span_ids requires 1 to 200 items")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getSpanBatch(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) TraceDetail(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	traceID := strings.TrimPrefix(request.URL.Path, "/api/v1/ai-vision/traces/")
	if traceID == "" || strings.Contains(traceID, "/") {
		http.NotFound(response, request)
		return
	}
	params, err := h.nativeParams(request)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getTraceDetail(ctx, orgID, traceID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) Sessions(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.URL.Path != "/api/v1/ai-vision/sessions" {
		http.NotFound(response, request)
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	params, err := h.nativeParams(request)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.listSessions(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) SessionIOBatch(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	payload, params, ok := h.decodeNativeBatch(response, request)
	if !ok {
		return
	}
	params.SessionIDs = uniqueNativeIDs(payload.SessionIDs)
	if len(params.SessionIDs) == 0 || len(params.SessionIDs) > 100 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "session_ids requires 1 to 100 items")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getSessionIOBatch(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) SessionUsageBatch(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	payload, params, ok := h.decodeNativeBatch(response, request)
	if !ok {
		return
	}
	params.SessionIDs = uniqueNativeIDs(payload.SessionIDs)
	if len(params.SessionIDs) == 0 || len(params.SessionIDs) > 100 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "session_ids requires 1 to 100 items")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getSessionUsageBatch(ctx, orgID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) SessionDetail(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	sessionID := strings.TrimPrefix(request.URL.Path, "/api/v1/ai-vision/sessions/")
	if sessionID == "" || strings.Contains(sessionID, "/") {
		http.NotFound(response, request)
		return
	}
	params, err := h.nativeParams(request)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.getSessionDetail(ctx, orgID, sessionID, params)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) EventsMetadata(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodGet {
		methodNotAllowed(response, http.MethodGet)
		return
	}
	payload := eventMetadataRequest{
		SpaceID:      strings.TrimSpace(request.URL.Query().Get("space_id")),
		AgentProduct: strings.TrimSpace(request.URL.Query().Get("agent_product")),
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.eventMetadata(ctx, orgID, payload)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	result.Fields = sortedEventMetadataFields(result.Fields)
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) EventsList(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	var payload eventListRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.listEvents(ctx, orgID, payload)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) EventsFacets(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	var payload eventFacetRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.listEventFacets(ctx, orgID, payload)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) Dashboard(response http.ResponseWriter, request *http.Request) {
	orgID, authenticated := h.organization(response, request)
	if !authenticated {
		return
	}
	if request.Method != http.MethodPost {
		methodNotAllowed(response, http.MethodPost)
		return
	}
	var payload dashboardRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return
	}
	if strings.TrimSpace(payload.QueryKey) == "" {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "queryKey must not be empty")
		return
	}
	payload.SpaceID = strings.TrimSpace(payload.SpaceID)
	if payload.SpaceID == "" || len(payload.SpaceID) > 255 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "space_id must be a non-empty string of at most 255 characters")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), h.cfg.QueryTimeout)
	defer cancel()
	result, err := h.backend.dashboardQuery(ctx, orgID, payload)
	if err != nil {
		h.writeBackendError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (h *handler) nativeParams(request *http.Request) (nativeListParams, error) {
	params := defaultNativeParams()
	query := request.URL.Query()
	params.User = strings.TrimSpace(query.Get("user"))
	params.SpaceID = strings.TrimSpace(query.Get("space_id"))
	if params.SpaceID == "" {
		return nativeListParams{}, fmt.Errorf("space_id is required")
	}
	if len(params.SpaceID) > 255 {
		return nativeListParams{}, fmt.Errorf("invalid space_id")
	}
	params.AgentProduct = strings.TrimSpace(query.Get("agent_product"))
	params.TraceID = strings.TrimSpace(query.Get("trace_id"))
	params.SessionID = strings.TrimSpace(query.Get("session_id"))
	params.OrderBy = strings.TrimSpace(query.Get("orderBy"))
	if params.OrderBy == "" {
		params.OrderBy = strings.TrimSpace(query.Get("order_by"))
	}
	params.SearchType = strings.TrimSpace(query.Get("searchType"))
	if params.SearchType == "" {
		params.SearchType = strings.TrimSpace(query.Get("search_type"))
	}
	params.Keyword = strings.TrimSpace(query.Get("keyword"))
	params.InputKeyword = strings.TrimSpace(query.Get("input_keyword"))
	params.Env = strings.TrimSpace(query.Get("env"))
	params.Scene = strings.TrimSpace(query.Get("scene"))
	params.Username = strings.TrimSpace(query.Get("username"))
	params.IncludeSpans = isTruthyNativeParam(query.Get("include_spans"))

	var err error
	if params.Fields, err = parseNativeStringList(query["fields"]); err != nil {
		return nativeListParams{}, fmt.Errorf("fields: %w", err)
	}
	if params.Tags, err = parseNativeStringList(query["tags"]); err != nil {
		return nativeListParams{}, fmt.Errorf("tags: %w", err)
	}
	if rawFilters := strings.TrimSpace(query.Get("filters")); rawFilters != "" {
		if err := json.Unmarshal([]byte(rawFilters), &params.Filters); err != nil {
			return nativeListParams{}, fmt.Errorf("filters must be a JSON array")
		}
	}
	if raw := strings.TrimSpace(query.Get("trace_ids")); raw != "" {
		if params.TraceIDs, err = parseNativeStringList([]string{raw}); err != nil {
			return nativeListParams{}, fmt.Errorf("trace_ids: %w", err)
		}
	}
	if raw := strings.TrimSpace(query.Get("session_ids")); raw != "" {
		if params.SessionIDs, err = parseNativeStringList([]string{raw}); err != nil {
			return nativeListParams{}, fmt.Errorf("session_ids: %w", err)
		}
	}

	if raw := query.Get("from"); raw != "" {
		params.From, err = strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return nativeListParams{}, fmt.Errorf("from must be epoch milliseconds")
		}
	}
	if raw := query.Get("to"); raw != "" {
		params.To, err = strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return nativeListParams{}, fmt.Errorf("to must be epoch milliseconds")
		}
	}
	if raw := query.Get("page"); raw != "" {
		params.Page, err = strconv.Atoi(raw)
		if err != nil || params.Page < 1 {
			return nativeListParams{}, fmt.Errorf("page must be a positive integer")
		}
	}
	if raw := query.Get("limit"); raw != "" {
		params.Limit, err = strconv.Atoi(raw)
		if err != nil || params.Limit < 1 {
			return nativeListParams{}, fmt.Errorf("limit must be a positive integer")
		}
	}
	if params.Limit > h.cfg.MaxLimit {
		params.Limit = h.cfg.MaxLimit
	}
	if err := validateRange(params.From, params.To, h.cfg.MaxQueryRange); err != nil {
		return nativeListParams{}, err
	}
	return params, nil
}

func defaultNativeParams() nativeListParams {
	now := time.Now().UTC()
	return nativeListParams{
		From:  now.Add(-24 * time.Hour).UnixMilli(),
		To:    now.UnixMilli(),
		Page:  1,
		Limit: 50,
	}
}

func parseNativeStringList(rawValues []string) ([]string, error) {
	result := make([]string, 0)
	for _, raw := range rawValues {
		value := strings.TrimSpace(raw)
		if value == "" {
			continue
		}
		if strings.HasPrefix(value, "[") {
			var decoded []string
			if err := json.Unmarshal([]byte(value), &decoded); err != nil {
				return nil, fmt.Errorf("must be a JSON string array or comma-separated values")
			}
			result = append(result, decoded...)
			continue
		}
		result = append(result, strings.Split(value, ",")...)
	}
	return uniqueNativeIDs(result), nil
}

func isTruthyNativeParam(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func (h *handler) decodeNativeBatch(response http.ResponseWriter, request *http.Request) (nativeBatchRequest, nativeListParams, bool) {
	var payload nativeBatchRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return nativeBatchRequest{}, nativeListParams{}, false
	}
	params := defaultNativeParams()
	if payload.From != 0 {
		params.From = payload.From
	}
	if payload.To != 0 {
		params.To = payload.To
	}
	params.User = strings.TrimSpace(payload.User)
	params.SpaceID = strings.TrimSpace(payload.SpaceID)
	if params.SpaceID == "" {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "space_id is required")
		return nativeBatchRequest{}, nativeListParams{}, false
	}
	if len(params.SpaceID) > 255 {
		writeAPIError(response, http.StatusBadRequest, "bad_data", "invalid space_id")
		return nativeBatchRequest{}, nativeListParams{}, false
	}
	params.AgentProduct = strings.TrimSpace(payload.AgentProduct)
	if err := validateRange(params.From, params.To, h.cfg.MaxQueryRange); err != nil {
		writeAPIError(response, http.StatusBadRequest, "bad_data", err.Error())
		return nativeBatchRequest{}, nativeListParams{}, false
	}
	return payload, params, true
}

func (h *handler) writeBackendError(rw http.ResponseWriter, err error) {
	if errors.Is(err, errNotFound) {
		render.Error(rw, errors.NewNotFoundf(errors.CodeNotFound, "resource not found"))
	} else if errors.Is(err, context.DeadlineExceeded) {
		render.Error(rw, errors.New(errors.TypeTimeout, errors.CodeTimeout, "query timed out"))
	} else if message := err.Error(); strings.Contains(message, "unsupported") || strings.Contains(message, "must ") || strings.Contains(message, "invalid") || strings.Contains(message, "exceeds") || strings.Contains(message, "requires") {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "%s", message))
	} else {
		h.logger.Error("AI Vision query failed", "error", err)
		render.Error(rw, errors.NewInternalf(errors.CodeInternal, "query failed"))
	}
}

func decodeJSON(request *http.Request, target any) error {
	decoder := json.NewDecoder(io.LimitReader(request.Body, 1<<20))
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return fmt.Errorf("request body must contain one JSON object")
	}
	return nil
}

func writeJSON(response http.ResponseWriter, status int, payload any) {
	render.Success(response, status, payload)
}

func writeAPIError(rw http.ResponseWriter, status int, kind, message string) {
	render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "%s", message))
}
func methodNotAllowed(rw http.ResponseWriter, allowed string) {
	rw.Header().Set("Allow", allowed)
	rw.WriteHeader(http.StatusMethodNotAllowed)
}
