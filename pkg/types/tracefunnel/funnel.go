package traceFunnels

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// metadata for funnels

type BaseMetadata struct {
	types.Identifiable // funnel id
	types.TimeAuditable
	types.UserAuditable
	Name        string      `json:"funnel_name" bun:"name,type:text,notnull"` // funnel name
	Description string      `json:"description" bun:"description,type:text"`  // funnel description
	OrgID       valuer.UUID `json:"org_id" bun:"org_id,type:varchar,notnull"`
}

// Funnel Core Data Structure (Funnel and FunnelStep)
type Funnel struct {
	bun.BaseModel `bun:"table:trace_funnel"`
	BaseMetadata
	Steps         []FunnelStep `json:"steps" bun:"steps,type:text,notnull"`
	Tags          string       `json:"tags" bun:"tags,type:text"`
	CreatedByUser *types.User  `json:"user" bun:"rel:belongs-to,join:created_by=id"`
}

type FunnelStep struct {
	Name           string        `json:"name,omitempty"`        // step name
	Description    string        `json:"description,omitempty"` // step description
	Order          int64         `json:"step_order"`
	ServiceName    string        `json:"service_name"`
	SpanName       string        `json:"span_name"`
	Filters        *v3.FilterSet `json:"filters,omitempty"`
	LatencyPointer string        `json:"latency_pointer,omitempty"`
	LatencyType    string        `json:"latency_type,omitempty"`
	HasErrors      bool          `json:"has_errors"`
}

// FunnelRequest represents all possible funnel-related requests
type FunnelRequest struct {
	// Common fields
	FunnelID    valuer.UUID  `json:"funnel_id,omitempty"`
	Steps       []FunnelStep `json:"steps,omitempty"`
	Timestamp   int64        `json:"timestamp,omitempty"`
	Description string       `json:"description,omitempty"`
	UserID      string       `json:"user_id,omitempty"`
	Name        string       `json:"funnel_name,omitempty"`

	// Analytics specific fields
	StartTime  int64 `json:"start_time,omitempty"`
	EndTime    int64 `json:"end_time,omitempty"`
	StepAOrder int64 `json:"step_a_order,omitempty"`
	StepBOrder int64 `json:"step_b_order,omitempty"`
}

// FunnelResponse represents all possible funnel-related responses
type FunnelResponse struct {
	// Common fields
	Description string       `json:"description,omitempty"`
	CreatedAt   int64        `json:"created_at,omitempty"`
	UpdatedAt   int64        `json:"updated_at,omitempty"`
	CreatedBy   string       `json:"created_by,omitempty"`
	UpdatedBy   string       `json:"updated_by,omitempty"`
	OrgID       string       `json:"org_id,omitempty"`
	Steps       []FunnelStep `json:"steps,omitempty"`

	// Special fields
	FunnelID          string  `json:"funnel_id,omitempty"`
	FunnelName        string  `json:"funnel_name,omitempty"`
	CreationTimestamp int64   `json:"creation_timestamp,omitempty"`
	UserEmail         string  `json:"user_email,omitempty"`
	Funnel            *Funnel `json:"funnel,omitempty"`
}

// TimeRange represents a time range for analytics
type TimeRange struct {
	StartTime int64 `json:"start_time"`
	EndTime   int64 `json:"end_time"`
}

// StepTransitionRequest represents a request for step transition analytics
type StepTransitionRequest struct {
	TimeRange
	StepAOrder int64 `json:"step_a_order"`
	StepBOrder int64 `json:"step_b_order"`
}

// UserInfo represents basic user information
type UserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// Analytics on traces
type FunnelAnalytics struct {
	TotalStart     int64   `json:"total_start"`
	TotalComplete  int64   `json:"total_complete"`
	ErrorCount     int64   `json:"error_count"`
	AvgDurationMs  float64 `json:"avg_duration_ms"`
	P99LatencyMs   float64 `json:"p99_latency_ms"`
	ConversionRate float64 `json:"conversion_rate"`
}

type ValidTracesResponse struct {
	TraceIDs []string `json:"trace_ids"`
}
