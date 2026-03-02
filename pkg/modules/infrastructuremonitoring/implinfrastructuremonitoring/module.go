package implinfrastructuremonitoring

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/infrastructuremonitoring"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	fieldMapper            qbtypes.FieldMapper
	condBuilder            qbtypes.ConditionBuilder
	logger                 *slog.Logger
	cache                  cache.Cache
	config                 infrastructuremonitoring.Config
}

// NewModule constructs the infrastructure monitoring module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore, telemetryMetadataStore telemetrytypes.MetadataStore, cache cache.Cache, providerSettings factory.ProviderSettings, cfg infrastructuremonitoring.Config) infrastructuremonitoring.Module {
	fieldMapper := telemetrymetrics.NewFieldMapper()
	condBuilder := telemetrymetrics.NewConditionBuilder(fieldMapper)
	return &module{
		telemetryStore:         ts,
		fieldMapper:            fieldMapper,
		condBuilder:            condBuilder,
		logger:                 providerSettings.Logger,
		telemetryMetadataStore: telemetryMetadataStore,
		cache:                  cache,
		config:                 cfg,
	}
}

func (m *module) HealthCheck(ctx context.Context) (*infrastructuremonitoringtypes.HealthCheckResponse, error) {
	return &infrastructuremonitoringtypes.HealthCheckResponse{
		Status:  "ok",
		Message: "Infrastructure Monitoring Module is healthy",
	}, nil
}
