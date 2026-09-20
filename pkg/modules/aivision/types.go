package aivision

type pageMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

type nativeFilter struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value any    `json:"value"`
}

type nativeFacetValue struct {
	Value any `json:"value"`
	Count int `json:"count"`
}

type nativeFacets map[string][]nativeFacetValue

type nativeTraceListResponse struct {
	Data   []map[string]any `json:"data"`
	Meta   pageMeta         `json:"meta"`
	Facets nativeFacets     `json:"facets,omitempty"`
}

type nativeTraceDetailResponse struct {
	TraceID   string           `json:"traceId"`
	SessionID any              `json:"sessionId"`
	Spans     []map[string]any `json:"spans"`
}

type nativeSessionListResponse struct {
	Data   []map[string]any `json:"data"`
	Meta   pageMeta         `json:"meta"`
	Facets nativeFacets     `json:"facets,omitempty"`
}

type nativeSessionDetailResponse struct {
	SessionID  string           `json:"sessionId"`
	TraceCount int              `json:"traceCount"`
	TraceIDs   []string         `json:"traceIds"`
	TimeRange  map[string]any   `json:"timeRange"`
	Spans      []map[string]any `json:"spans,omitempty"`
}

type nativeBatchRequest struct {
	From         int64    `json:"from"`
	To           int64    `json:"to"`
	User         string   `json:"user"`
	SpaceID      string   `json:"space_id"`
	AgentProduct string   `json:"agent_product"`
	TraceID      string   `json:"trace_id"`
	TraceIDs     []string `json:"trace_ids"`
	SessionIDs   []string `json:"session_ids"`
	SpanIDs      []string `json:"span_ids"`
}

type nativeIOItem struct {
	ID     string `json:"id"`
	Input  any    `json:"input"`
	Output any    `json:"output"`
}

type nativeIOBatchResponse struct {
	Data []nativeIOItem `json:"data"`
}

type nativeUsageItem struct {
	ID           string         `json:"id"`
	InputTokens  float64        `json:"inputTokens"`
	OutputTokens float64        `json:"outputTokens"`
	TotalTokens  float64        `json:"totalTokens"`
	UsageDetails map[string]any `json:"usageDetails"`
	Usage        map[string]any `json:"usage"`
}

type nativeUsageBatchResponse struct {
	Data []nativeUsageItem `json:"data"`
}

type nativeSpanBatchResponse struct {
	Spans []map[string]any `json:"spans"`
}

type dashboardRequest struct {
	QueryKey     string         `json:"queryKey"`
	Scope        string         `json:"scope"`
	From         int64          `json:"from"`
	To           int64          `json:"to"`
	SpaceID      string         `json:"space_id"`
	User         string         `json:"user"`
	AgentProduct string         `json:"agent_product"`
	Params       map[string]any `json:"params"`
}

type dashboardResponse struct {
	QueryKey string            `json:"queryKey"`
	Columns  []dashboardColumn `json:"columns"`
	Rows     []map[string]any  `json:"rows"`
	Meta     map[string]any    `json:"meta,omitempty"`
}

type dashboardColumn struct {
	Key  string `json:"key"`
	Type string `json:"type,omitempty"`
}
