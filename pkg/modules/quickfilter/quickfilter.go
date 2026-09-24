package quickfilter

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Get returns the stored quick filter row for a source.
	Get(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source) (*quickfiltertypes.StorableQuickFilter, error)
	// GetQuickFilters returns quick filters for a source, or for every source when source is zero.
	GetQuickFilters(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source) ([]*quickfiltertypes.SourceFilters, error)
	UpsertQuickFilters(ctx context.Context, orgID valuer.UUID, source quickfiltertypes.Source, filters []telemetrytypes.TelemetryFieldKey) error
	SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error
}

type Handler interface {
	// Legacy v1 endpoints, served by converting to and from the v3 attribute key shape.
	GetQuickFilters(http.ResponseWriter, *http.Request)
	UpdateQuickFilters(http.ResponseWriter, *http.Request)
	GetSourceFilters(http.ResponseWriter, *http.Request)

	ListQuickFiltersV2(http.ResponseWriter, *http.Request)
	GetQuickFiltersV2(http.ResponseWriter, *http.Request)
	UpdateQuickFiltersV2(http.ResponseWriter, *http.Request)
}
