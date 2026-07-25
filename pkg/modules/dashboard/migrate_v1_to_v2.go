package dashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// V1ToV2Migrator is the temporary v1→v2 bulk-conversion capability. It is kept
// off the core Module interface (and off the base branch) so this scaffolding
// never merges to main; callers on the migration branches obtain it by
// type-asserting a Module to V1ToV2Migrator.
type V1ToV2Migrator interface {
	ConvertAllV1ToV2(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.V1ToV2MigrationResult, error)
}
