package promote

import (
	"context"
	"net/http"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type Module interface {
	ListBodySkipIndexes(ctx context.Context) ([]schemamigrator.Index, error)
	ListPromotedPaths(ctx context.Context) ([]string, error)
	PromoteAndIndexPaths(ctx context.Context, paths ...promotetypes.PromotePath) error
}

type Handler interface {
	HandlePromote(w http.ResponseWriter, r *http.Request)
}
