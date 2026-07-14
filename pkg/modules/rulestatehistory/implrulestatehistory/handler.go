package implrulestatehistory

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

type handler struct {
	module rulestatehistory.Module
}

type ruleHistoryRequest struct {
	Query  rulestatehistorytypes.Query
	Cursor string
}

type cursorToken struct {
	Offset int64 `json:"offset"`
	Limit  int64 `json:"limit"`
}

func NewHandler(module rulestatehistory.Module) rulestatehistory.Handler {
	return &handler{module: module}
}

func (h *handler) GetRuleHistoryStats(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	query, ok := h.parseV2BaseQueryRequest(w, r)
	if !ok {
		return
	}

	stats, err := h.module.GetHistoryStats(r.Context(), ruleID, query)
	if err != nil {
		render.Error(w, err)
		return
	}
	render.Success(w, http.StatusOK, stats)
}

func (h *handler) GetRuleHistoryOverallStatus(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	query, ok := h.parseV2BaseQueryRequest(w, r)
	if !ok {
		return
	}

	res, err := h.module.GetHistoryOverallStatus(r.Context(), ruleID, query)
	if err != nil {
		render.Error(w, err)
		return
	}
	render.Success(w, http.StatusOK, res)
}

func (h *handler) GetRuleHistoryTimeline(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	req, ok := h.parseV2TimelineQueryRequest(w, r)
	if !ok {
		return
	}
	if req.Cursor != "" {
		token, err := decodeCursor(req.Cursor)
		if err != nil {
			render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid cursor"))
			return
		}
		req.Query.Offset = token.Offset
		if req.Query.Limit == 0 {
			req.Query.Limit = token.Limit
		}
	}
	if req.Query.Limit == 0 {
		req.Query.Limit = 50
	}

	timelineItems, timelineTotal, err := h.module.GetHistoryTimeline(r.Context(), ruleID, req.Query)
	if err != nil {
		render.Error(w, err)
		return
	}

	resp := rulestatehistorytypes.GettableRuleStateTimeline{}
	resp.Items = make([]rulestatehistorytypes.GettableRuleStateHistory, 0, len(timelineItems))
	for _, item := range timelineItems {
		resp.Items = append(resp.Items, rulestatehistorytypes.GettableRuleStateHistory{
			RuleID:              item.RuleID,
			RuleName:            item.RuleName,
			OverallState:        item.OverallState,
			OverallStateChanged: item.OverallStateChanged,
			State:               item.State,
			StateChanged:        item.StateChanged,
			UnixMilli:           item.UnixMilli,
			Labels:              item.Labels.ToQBLabels(),
			Fingerprint:         item.Fingerprint,
			Value:               item.Value,
		})
	}
	resp.Total = timelineTotal
	if req.Query.Limit > 0 && req.Query.Offset+int64(len(timelineItems)) < int64(timelineTotal) {
		nextOffset := req.Query.Offset + int64(len(timelineItems))
		nextCursor, err := encodeCursor(cursorToken{Offset: nextOffset, Limit: req.Query.Limit})
		if err != nil {
			render.Error(w, err)
			return
		}
		resp.NextCursor = nextCursor
	}
	render.Success(w, http.StatusOK, resp)
}

func (h *handler) GetRuleHistoryContributors(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	query, ok := h.parseV2BaseQueryRequest(w, r)
	if !ok {
		return
	}

	res, err := h.module.GetHistoryContributors(r.Context(), ruleID, query)
	if err != nil {
		render.Error(w, err)
		return
	}
	converted := make([]rulestatehistorytypes.GettableRuleStateHistoryContributor, 0, len(res))
	for _, item := range res {
		converted = append(converted, rulestatehistorytypes.GettableRuleStateHistoryContributor{
			Fingerprint:       item.Fingerprint,
			Labels:            item.Labels.ToQBLabels(),
			Count:             item.Count,
			RelatedTracesLink: item.RelatedTracesLink,
			RelatedLogsLink:   item.RelatedLogsLink,
		})
	}
	render.Success(w, http.StatusOK, converted)
}

func (h *handler) GetRuleHistoryFilterKeys(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	query, search, limit, ok := h.parseV2FilterKeysRequest(w, r)
	if !ok {
		return
	}

	res, err := h.module.GetHistoryFilterKeys(r.Context(), ruleID, query, search, limit)
	if err != nil {
		render.Error(w, err)
		return
	}
	render.Success(w, http.StatusOK, res)
}

func (h *handler) GetRuleHistoryFilterValues(w http.ResponseWriter, r *http.Request) {
	ruleID := mux.Vars(r)["id"]
	query, key, search, limit, ok := h.parseV2FilterValuesRequest(w, r)
	if !ok {
		return
	}

	res, err := h.module.GetHistoryFilterValues(r.Context(), ruleID, key, query, search, limit)
	if err != nil {
		render.Error(w, err)
		return
	}
	render.Success(w, http.StatusOK, res)
}

func (h *handler) parseV2BaseQueryRequest(w http.ResponseWriter, r *http.Request) (rulestatehistorytypes.Query, bool) {
	query, err := parseV2BaseQueryFromURL(r)
	if err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return rulestatehistorytypes.Query{}, false
	}
	if query.Start == 0 || query.End == 0 || query.Start >= query.End {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "start and end are required and start must be less than end"))
		return rulestatehistorytypes.Query{}, false
	}
	return query, true
}

func (h *handler) parseV2TimelineQueryRequest(w http.ResponseWriter, r *http.Request) (*ruleHistoryRequest, bool) {
	req, err := parseV2TimelineQueryFromURL(r)
	if err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return nil, false
	}
	if err := req.Query.Validate(); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return nil, false
	}
	return req, true
}

func (h *handler) parseV2FilterKeysRequest(w http.ResponseWriter, r *http.Request) (rulestatehistorytypes.Query, string, int64, bool) {
	raw := telemetrytypes.PostableFieldKeysParams{}
	if err := binding.Query.BindQuery(r.URL.Query(), &raw); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return rulestatehistorytypes.Query{}, "", 0, false
	}

	query := rulestatehistorytypes.Query{
		Start:            raw.StartUnixMilli,
		End:              raw.EndUnixMilli,
		FilterExpression: qbtypes.Filter{},
		Order:            qbtypes.OrderDirectionAsc,
	}
	if err := query.Validate(); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return rulestatehistorytypes.Query{}, "", 0, false
	}

	limit := normalizeFilterLimit(int64(raw.Limit))
	return query, strings.TrimSpace(raw.SearchText), limit, true
}

func (h *handler) parseV2FilterValuesRequest(w http.ResponseWriter, r *http.Request) (rulestatehistorytypes.Query, string, string, int64, bool) {
	raw := telemetrytypes.PostableFieldValueParams{}
	if err := binding.Query.BindQuery(r.URL.Query(), &raw); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return rulestatehistorytypes.Query{}, "", "", 0, false
	}

	key := strings.TrimSpace(raw.Name)
	if key == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "key is required"))
		return rulestatehistorytypes.Query{}, "", "", 0, false
	}

	query := rulestatehistorytypes.Query{
		Start:            raw.StartUnixMilli,
		End:              raw.EndUnixMilli,
		FilterExpression: parseFilterExpression(raw.ExistingQuery),
		Order:            qbtypes.OrderDirectionAsc,
	}
	if err := query.Validate(); err != nil {
		render.Error(w, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid query parameters"))
		return rulestatehistorytypes.Query{}, "", "", 0, false
	}

	limit := normalizeFilterLimit(int64(raw.Limit))
	return query, key, strings.TrimSpace(raw.SearchText), limit, true
}

func parseV2BaseQueryFromURL(r *http.Request) (rulestatehistorytypes.Query, error) {
	raw := rulestatehistorytypes.PostableRuleStateHistoryBaseQuery{}
	if err := binding.Query.BindQuery(r.URL.Query(), &raw); err != nil {
		return rulestatehistorytypes.Query{}, err
	}

	return rulestatehistorytypes.Query{
		Start: raw.Start,
		End:   raw.End,
	}, nil
}

func parseV2TimelineQueryFromURL(r *http.Request) (*ruleHistoryRequest, error) {
	raw := rulestatehistorytypes.PostableRuleStateHistoryTimelineQuery{}
	if err := binding.Query.BindQuery(r.URL.Query(), &raw); err != nil {
		return nil, err
	}

	req := &ruleHistoryRequest{}
	req.Query.Start = raw.Start
	req.Query.End = raw.End
	req.Query.State = raw.State
	req.Query.Limit = raw.Limit
	req.Query.Order = raw.Order
	req.Query.FilterExpression = parseFilterExpression(raw.FilterExpression)
	req.Cursor = raw.Cursor
	return req, nil
}

func encodeCursor(token cursorToken) (string, error) {
	data, err := json.Marshal(token)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func decodeCursor(cursor string) (*cursorToken, error) {
	data, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	token := &cursorToken{}
	if err := json.Unmarshal(data, token); err != nil {
		return nil, err
	}
	return token, nil
}

func normalizeFilterLimit(limit int64) int64 {
	if limit <= 0 {
		return 50
	}
	if limit > 200 {
		return 200
	}
	return limit
}

func parseFilterExpression(values ...string) qbtypes.Filter {
	for _, value := range values {
		expr := strings.TrimSpace(value)
		if expr != "" {
			return qbtypes.Filter{Expression: expr}
		}
	}
	return qbtypes.Filter{}
}
