package tracefunnel

import (
	"context"
	"net/http"

	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
)

// Module defines the interface for trace funnel operations
type Module interface {
	// operations on funnel
	Create(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error)

	Get(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error)

	Update(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error

	List(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error)

	Delete(ctx context.Context, funnelID string) error

	Save(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error

	GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error)
	//
	//GetFunnelAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error)
	//
	//GetStepAnalytics(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) (*traceFunnels.FunnelAnalytics, error)
	//
	//GetSlowestTraces(ctx context.Context, funnel *traceFunnels.Funnel, stepAOrder, stepBOrder int64, timeRange traceFunnels.TimeRange, isError bool) (*traceFunnels.ValidTracesResponse, error)

	// updates funnel metadata
	//UpdateMetadata(ctx context.Context, funnelID valuer.UUID, name, description string, userID string) error

	// validates funnel
	//ValidateTraces(ctx context.Context, funnel *traceFunnels.Funnel, timeRange traceFunnels.TimeRange) ([]*v3.Row, error)
}

type Handler interface {
	// CRUD on funnel
	New(http.ResponseWriter, *http.Request)

	UpdateSteps(http.ResponseWriter, *http.Request)

	UpdateFunnel(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)

	Save(http.ResponseWriter, *http.Request)

	// validator handlers
	//ValidateTraces(http.ResponseWriter, *http.Request)
	//
	//// Analytics handlers
	//FunnelAnalytics(http.ResponseWriter, *http.Request)
	//
	//StepAnalytics(http.ResponseWriter, *http.Request)
	//
	//SlowestTraces(http.ResponseWriter, *http.Request)
	//
	//ErrorTraces(http.ResponseWriter, *http.Request)
}
