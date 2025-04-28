package tracefunnel

import (
	"context"
	"fmt"
	"time"

	tracefunnels "github.com/SigNoz/signoz/pkg/modules/tracefunnel/core"

	"github.com/SigNoz/signoz/pkg/types"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Api defines the interface for trace funnel operations
type Api interface {
	// Funnel Management
	CreateFunnel(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error)
	GetFunnel(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error)
	UpdateFunnel(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error
	ListFunnels(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error)
	DeleteFunnel(ctx context.Context, funnelID string) error
	SaveFunnel(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error
	GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error)
	UpdateMetadata(ctx context.Context, funnelID valuer.UUID, name, description string, userID string) error

	// Analytics
	ValidateTraces(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.ValidTracesResponse, error)
	GetFunnelAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error)
	GetStepAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error)
	GetSlowestTraces(ctx context.Context, funnel *traceFunnels.Funnel, stepAOrder, stepBOrder int64, timeRange traceFunnels.TimeRange, isError bool) (*traceFunnels.ValidTracesResponse, error)
}

// tracefunnel implements the Api interface
type tracefunnel struct {
	store traceFunnels.TraceFunnelStore
}

// Newtracefunnel creates a new trace funnel service
func NewAPI(store traceFunnels.TraceFunnelStore) Api {
	return &tracefunnel{
		store: store,
	}
}

// CreateFunnel creates a new funnel
func (tf *tracefunnel) CreateFunnel(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error) {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, fmt.Errorf("invalid org ID: %v", err)
	}

	funnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Name:  name,
			OrgID: orgUUID,
		},
	}
	funnel.CreatedAt = time.Unix(0, timestamp*1000000) // Convert to nanoseconds
	funnel.CreatedBy = userID

	// Set up the user relationship
	funnel.CreatedByUser = &types.User{
		ID: userID,
	}

	if err := tf.store.Create(ctx, funnel); err != nil {
		return nil, fmt.Errorf("failed to create funnel: %v", err)
	}

	return funnel, nil
}

// GetFunnel gets a funnel by ID
func (tf *tracefunnel) GetFunnel(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error) {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return nil, fmt.Errorf("invalid funnel ID: %v", err)
	}
	return tf.store.Get(ctx, uuid)
}

// UpdateFunnel updates a funnel
func (tf *tracefunnel) UpdateFunnel(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error {
	funnel.UpdatedBy = userID
	return tf.store.Update(ctx, funnel)
}

// ListFunnels lists all funnels for an organization
func (tf *tracefunnel) ListFunnels(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error) {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, fmt.Errorf("invalid org ID: %v", err)
	}

	funnels, err := tf.store.List(ctx)
	if err != nil {
		return nil, err
	}

	// Filter by orgID
	var orgFunnels []*traceFunnels.Funnel
	for _, f := range funnels {
		if f.OrgID == orgUUID {
			orgFunnels = append(orgFunnels, f)
		}
	}

	return orgFunnels, nil
}

// DeleteFunnel deletes a funnel
func (tf *tracefunnel) DeleteFunnel(ctx context.Context, funnelID string) error {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return fmt.Errorf("invalid funnel ID: %v", err)
	}
	return tf.store.Delete(ctx, uuid)
}

// SaveFunnel saves a funnel
func (tf *tracefunnel) SaveFunnel(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return fmt.Errorf("invalid org ID: %v", err)
	}

	funnel.UpdatedBy = userID
	funnel.OrgID = orgUUID
	return tf.store.Update(ctx, funnel)
}

// GetFunnelMetadata gets metadata for a funnel
func (tf *tracefunnel) GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error) {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return 0, 0, "", fmt.Errorf("invalid funnel ID: %v", err)
	}

	funnel, err := tf.store.Get(ctx, uuid)
	if err != nil {
		return 0, 0, "", err
	}

	return funnel.CreatedAt.UnixNano() / 1000000, funnel.UpdatedAt.UnixNano() / 1000000, funnel.Description, nil
}

// ValidateTraces validates traces in a funnel
func (tf *tracefunnel) ValidateTraces(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.ValidTracesResponse, error) {
	if err := tracefunnels.ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := tracefunnels.ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	_, err := tracefunnels.ValidateTraces(funnel, timeRange)
	if err != nil {
		return nil, fmt.Errorf("error building clickhouse query: %v", err)
	}

	// TODO: Execute query and return results
	// For now, return empty response
	return &traceFunnels.ValidTracesResponse{
		TraceIDs: []string{},
	}, nil
}

// GetFunnelAnalytics gets analytics for a funnel
func (tf *tracefunnel) GetFunnelAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error) {
	if err := tracefunnels.ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := tracefunnels.ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	_, err := tracefunnels.ValidateTracesWithLatency(funnel, timeRange)
	if err != nil {
		return nil, fmt.Errorf("error building clickhouse query: %v", err)
	}

	// TODO: Execute query and return results
	// For now, return empty analytics
	return &traceFunnels.FunnelAnalytics{
		TotalStart:     0,
		TotalComplete:  0,
		ErrorCount:     0,
		AvgDurationMs:  0,
		P99LatencyMs:   0,
		ConversionRate: 0,
	}, nil
}

// GetStepAnalytics gets analytics for each step
func (tf *tracefunnel) GetStepAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error) {
	if err := tracefunnels.ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := tracefunnels.ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	_, err := tracefunnels.GetStepAnalytics(funnel, timeRange)
	if err != nil {
		return nil, fmt.Errorf("error building clickhouse query: %v", err)
	}

	// TODO: Execute query and return results
	// For now, return empty analytics
	return &traceFunnels.FunnelAnalytics{
		TotalStart:     0,
		TotalComplete:  0,
		ErrorCount:     0,
		AvgDurationMs:  0,
		P99LatencyMs:   0,
		ConversionRate: 0,
	}, nil
}

// GetSlowestTraces gets the slowest traces between two steps
func (tf *tracefunnel) GetSlowestTraces(ctx context.Context, funnel *traceFunnels.Funnel, stepAOrder, stepBOrder int64, timeRange traceFunnels.TimeRange, isError bool) (*traceFunnels.ValidTracesResponse, error) {
	if err := tracefunnels.ValidateFunnel(funnel); err != nil {
		return nil, fmt.Errorf("invalid funnel: %v", err)
	}

	if err := tracefunnels.ValidateTimeRange(timeRange); err != nil {
		return nil, fmt.Errorf("invalid time range: %v", err)
	}

	_, err := tracefunnels.GetSlowestTraces(funnel, stepAOrder, stepBOrder, timeRange, isError)
	if err != nil {
		return nil, fmt.Errorf("error building clickhouse query: %v", err)
	}

	// TODO: Execute query and return results
	// For now, return empty response
	return &traceFunnels.ValidTracesResponse{
		TraceIDs: []string{},
	}, nil
}

// UpdateMetadata updates the metadata of a funnel
func (tf *tracefunnel) UpdateMetadata(ctx context.Context, funnelID valuer.UUID, name, description string, userID string) error {
	return tf.store.UpdateMetadata(ctx, funnelID, name, description, userID)
}
