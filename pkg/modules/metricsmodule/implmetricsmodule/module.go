package implmetricsmodule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/metricsmodule"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	telemetryStore telemetrystore.TelemetryStore
}

// NewModule constructs the metrics module with the provided dependencies.
func NewModule(ts telemetrystore.TelemetryStore) metricsmodule.Module {
	return &module{
		telemetryStore: ts,
	}
}

// GetStats will return metrics statistics once implemented.
func (m *module) GetStats(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.StatsRequest) (*metricsmoduletypes.StatsResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "metrics stats not implemented yet")
}

// GetTreemap will return metrics treemap information once implemented.
func (m *module) GetTreemap(ctx context.Context, orgID valuer.UUID, req *metricsmoduletypes.TreemapRequest) (*metricsmoduletypes.TreemapResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "metrics treemap not implemented yet")
}
