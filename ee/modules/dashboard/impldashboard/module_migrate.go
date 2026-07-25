package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Temporary v1→v2 bulk-migration scaffolding, kept off the core Module interface
// and in a dedicated branch-only file so base→branch merges stay conflict-free.
// Delegates to the wrapped OSS module, which implements dashboard.V1ToV2Migrator.
func (module *module) ConvertAllV1ToV2(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.V1ToV2MigrationResult, error) {
	return module.pkgDashboardModule.(dashboard.V1ToV2Migrator).ConvertAllV1ToV2(ctx, orgID)
}
