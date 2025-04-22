package traceFunnels

import v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"

type Funnel struct {
	ID        string       `json:"id"`
	Name      string       `json:"funnel_name"`
	CreatedAt int64        `json:"creation_timestamp"`
	CreatedBy string       `json:"user_id"`
	OrgID     string       `json:"org_id"`
	UpdatedAt int64        `json:"updated_timestamp,omitempty"`
	UpdatedBy string       `json:"updated_by,omitempty"`
	Steps     []FunnelStep `json:"steps"`
}

// FunnelStep Models
type FunnelStep struct {
	StepOrder      int64         `json:"step_order"`      // Order of the step in the funnel (1-based)
	ServiceName    string        `json:"service_name"`    // Service name for the span
	SpanName       string        `json:"span_name"`       // Span name to match
	Filters        *v3.FilterSet `json:"filters"`         // Additional SQL filters
	LatencyPointer string        `json:"latency_pointer"` // "start" or "end"
	LatencyType    string        `json:"latency_type"`    // "p99", "p95", "p90"
	HasErrors      bool          `json:"has_errors"`      // Whether to include error spans
}

// NewFunnelRequest Request/Response structures
// NewFunnelRequest is used to create a new funnel without steps
// Steps should be added separately using the update endpoint
type NewFunnelRequest struct {
	Name      string `json:"funnel_name"`
	Timestamp int64  `json:"creation_timestamp"` // Unix milliseconds timestamp
}

type NewFunnelResponse struct {
	ID        string `json:"funnel_id"`
	Name      string `json:"funnel_name"`
	CreatedAt int64  `json:"creation_timestamp"`
	CreatedBy string `json:"user_id"`
	OrgID     string `json:"org_id"`
}

type FunnelListResponse struct {
	ID        string `json:"id"`
	Name      string `json:"funnel_name"`
	CreatedAt int64  `json:"creation_timestamp"` // Unix nano timestamp
	CreatedBy string `json:"user_id"`
	OrgID     string `json:"org_id,omitempty"`
}

// FunnelStepRequest is used to add or update steps for an existing funnel
type FunnelStepRequest struct {
	FunnelID  string       `json:"funnel_id"`
	Steps     []FunnelStep `json:"steps"`
	Timestamp int64        `json:"updated_timestamp"` // Unix milliseconds timestamp for update time
}

type FunnelStepResponse struct {
	FunnelID  string       `json:"id"`
	Name      string       `json:"funnel_name"`
	Steps     []FunnelStep `json:"steps"`
	Timestamp int64        `json:"updated_timestamp"` // Unix milliseconds timestamp for update time
	CreatedAt int64        `json:"creation_timestamp"`
	CreatedBy string       `json:"user_id"`
	OrgID     string       `json:"org_id"`
	UpdatedBy string       `json:"updated_by"`
}

type FunnelInfoResponse struct {
	ID          string `json:"id"`
	Name        string `json:"funnel_name"`
	CreatedAt   int64  `json:"creation_timestamp"`
	CreatedBy   string `json:"user_id"`
	OrgID       string `json:"org_id"`
	UpdatedAt   int64  `json:"updated_timestamp,omitempty"`
	UpdatedBy   string `json:"updated_by,omitempty"`
	Tags        string `json:"tags,omitempty"`
	Description string `json:"description,omitempty"`
}

type FunnelDetailResponse struct {
	ID        string       `json:"id"`
	Name      string       `json:"funnel_name"`
	CreatedAt int64        `json:"creation_timestamp"`
	CreatedBy string       `json:"user_id"`
	OrgID     string       `json:"org_id"`
	Steps     []FunnelStep `json:"steps"`
	UpdatedAt int64        `json:"updated_timestamp,omitempty"`
	UpdatedBy string       `json:"updated_by,omitempty"`
}

type SaveFunnelResponse struct {
	Status      string `json:"status"`
	ID          string `json:"id"`
	Name        string `json:"name"`
	CreatedAt   string `json:"created_at,omitempty"`
	UpdatedAt   string `json:"updated_at,omitempty"`
	CreatedBy   string `json:"created_by,omitempty"`
	UpdatedBy   string `json:"updated_by,omitempty"`
	OrgID       string `json:"org_id,omitempty"`
	Tags        string `json:"tags,omitempty"`
	Description string `json:"description,omitempty"`
}

// TimeRange Analytics request/response types
type TimeRange struct {
	StartTime int64 `json:"start_time"` // Unix nano
	EndTime   int64 `json:"end_time"`   // Unix nano
}

type StepTransitionRequest struct {
	TimeRange
	StepAOrder int64 `json:"step_a_order"` // First step in transition
	StepBOrder int64 `json:"step_b_order"` // Second step in transition
}

type ValidTracesResponse struct {
	TraceIDs []string `json:"trace_ids"`
}

type FunnelAnalytics struct {
	TotalStart     int64   `json:"total_start"`
	TotalComplete  int64   `json:"total_complete"`
	ErrorCount     int64   `json:"error_count"`
	AvgDurationMs  float64 `json:"avg_duration_ms"`
	P99LatencyMs   float64 `json:"p99_latency_ms"`
	ConversionRate float64 `json:"conversion_rate"`
}
