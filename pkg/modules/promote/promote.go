package promote

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type Module interface {
	ListPromotedPaths(ctx context.Context, target promotetypes.Target) ([]promotetypes.PromotePath, error)
	PromotePaths(ctx context.Context, target promotetypes.Target, paths ...*promotetypes.PromotePath) error
}

type Handler interface {
	HandlePromoteAndIndexPaths(w http.ResponseWriter, r *http.Request)
	ListPromotedAndIndexedPaths(w http.ResponseWriter, r *http.Request)

	HandlePromoteAttributes(w http.ResponseWriter, r *http.Request)
	ListPromotedAttributes(w http.ResponseWriter, r *http.Request)
}
