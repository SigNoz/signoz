package promote

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type Module interface {
	ListPromotedPaths(ctx context.Context) ([]promotetypes.PromotePath, error)
	PromotePaths(ctx context.Context, paths ...*promotetypes.PromotePath) error
}

type Handler interface {
	PromotePaths(w http.ResponseWriter, r *http.Request)
	ListPromotedPaths(w http.ResponseWriter, r *http.Request)
}
