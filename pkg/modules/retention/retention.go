package retention

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Getter resolves retention data and expressions for read paths.
type Getter interface {
	// ActiveSlices returns retention rules active over a half-open meter window.
	ActiveSlices(
		ctx context.Context,
		orgID valuer.UUID,
		dbName string,
		tableName string,
		fallbackDefaultDays int,
		startMs int64,
		endMs int64,
	) ([]retentiontypes.Slice, error)
}
