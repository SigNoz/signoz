package promote

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type Module interface {
	ListPromotedAndIndexedPaths(ctx context.Context) ([]promotetypes.PromotePath, error)
	PromoteAndIndexPaths(ctx context.Context, paths ...*promotetypes.PromotePath) error
}

type Handler interface {
	HandlePromoteAndIndexPaths(w http.ResponseWriter, r *http.Request)
	ListPromotedAndIndexedPaths(w http.ResponseWriter, r *http.Request)
}
