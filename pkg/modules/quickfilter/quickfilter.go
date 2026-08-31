package quickfilter

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// GetQuickFilters returns quick filters for a signal, or for every signal when signal is zero.
	GetQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal) ([]*quickfiltertypes.SignalFilters, error)
	UpsertQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal, filters []telemetrytypes.TelemetryFieldKey) error
	SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error
}

type Handler interface {
	// Legacy v1 endpoints, served by converting to and from the v3 attribute key shape.
	GetQuickFilters(http.ResponseWriter, *http.Request)
	UpdateQuickFilters(http.ResponseWriter, *http.Request)
	GetSignalFilters(http.ResponseWriter, *http.Request)

	ListQuickFiltersV2(http.ResponseWriter, *http.Request)
	GetQuickFiltersV2(http.ResponseWriter, *http.Request)
	UpdateQuickFiltersV2(http.ResponseWriter, *http.Request)
}
