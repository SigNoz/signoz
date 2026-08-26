package quickfilter

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetQuickFilters(ctx context.Context, orgID valuer.UUID) ([]*quickfiltertypes.SignalFilters, error)
	UpdateQuickFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal, filters []telemetrytypes.TelemetryFieldKey) error
	GetSignalFilters(ctx context.Context, orgID valuer.UUID, signal quickfiltertypes.Signal) (*quickfiltertypes.SignalFilters, error)
	SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error
}

type Handler interface {
	// Legacy v1 endpoints, served by converting to and from the v3 attribute key shape.
	GetQuickFilters(http.ResponseWriter, *http.Request)
	UpdateQuickFilters(http.ResponseWriter, *http.Request)
	GetSignalFilters(http.ResponseWriter, *http.Request)

	GetQuickFiltersV2(http.ResponseWriter, *http.Request)
	UpdateQuickFiltersV2(http.ResponseWriter, *http.Request)
	GetSignalFiltersV2(http.ResponseWriter, *http.Request)
}
