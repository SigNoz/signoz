package tracefunneltypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrFunnelAlreadyExists = errors.MustNewCode("funnel_already_exists")
)

// StorableFunnel Core Data Structure (StorableFunnel and FunnelStep)
type StorableFunnel struct {
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	bun.BaseModel `bun:"table:trace_funnel"`
	Name          string        `json:"funnel_name" bun:"name,type:text,notnull"`
	Description   string        `json:"description" bun:"description,type:text"`
	OrgID         valuer.UUID   `json:"org_id" bun:"org_id,type:varchar,notnull"`
	Steps         []*FunnelStep `json:"steps" bun:"steps,type:text,notnull"`
	Tags          string        `json:"tags" bun:"tags,type:text"`
}

type FunnelStep struct {
	ID             valuer.UUID   `json:"id,omitempty"`
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

// PostableFunnel represents all possible funnel-related requests
type PostableFunnel struct {
	FunnelID    valuer.UUID   `json:"funnel_id,omitempty"`
	Name        string        `json:"funnel_name,omitempty"`
	Timestamp   int64         `json:"timestamp,omitempty"`
	Description string        `json:"description,omitempty"`
	Steps       []*FunnelStep `json:"steps,omitempty"`
	UserID      string        `json:"user_id,omitempty"`

	// Analytics specific fields
	StartTime int64 `json:"start_time,omitempty"`
	EndTime   int64 `json:"end_time,omitempty"`
	StepStart int64 `json:"step_start,omitempty"`
	StepEnd   int64 `json:"step_end,omitempty"`
}

// GettableFunnel represents all possible funnel-related responses
type GettableFunnel struct {
	FunnelID    string          `json:"funnel_id,omitempty"`
	FunnelName  string          `json:"funnel_name,omitempty"`
	Description string          `json:"description,omitempty"`
	CreatedAt   int64           `json:"created_at,omitempty"`
	CreatedBy   string          `json:"created_by,omitempty"`
	UpdatedAt   int64           `json:"updated_at,omitempty"`
	UpdatedBy   string          `json:"updated_by,omitempty"`
	OrgID       string          `json:"org_id,omitempty"`
	UserEmail   string          `json:"user_email,omitempty"`
	Funnel      *StorableFunnel `json:"funnel,omitempty"`
	Steps       []*FunnelStep   `json:"steps,omitempty"`
}

// TimeRange represents a time range for analytics
type TimeRange struct {
	StartTime int64 `json:"start_time"`
	EndTime   int64 `json:"end_time"`
}

// StepTransitionRequest represents a request for step transition analytics
type StepTransitionRequest struct {
	TimeRange
	StepStart int64 `json:"step_start,omitempty"`
	StepEnd   int64 `json:"step_end,omitempty"`
}

type FunnelStepFilter struct {
	StepNumber     int
	ServiceName    string
	SpanName       string
	LatencyPointer string // "start" or "end"
	CustomFilters  *v3.FilterSet
}

func NewStorableFunnel(name string, description string, steps []*FunnelStep, tags string, createdBy string, orgID valuer.UUID) *StorableFunnel {
	return &StorableFunnel{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createdBy,
			UpdatedBy: createdBy,
		},
		Name:        name,
		Description: description,
		Steps:       steps,
		Tags:        tags,
		OrgID:       orgID,
	}
}

func (tf *StorableFunnel) Update(name string, description string, steps []*FunnelStep, updatedBy string) {
	if name != "" {
		tf.Name = name
	}

	if description != "" {
		tf.Description = description
	}

	if steps != nil {
		tf.Steps = steps
	}

	tf.UpdatedBy = updatedBy
	tf.UpdatedAt = time.Now()
}
