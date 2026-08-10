package savedviewtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	Create(ctx context.Context, view *SavedView) error
	Get(ctx context.Context, orgID string, id valuer.UUID) (*SavedView, error)
	Update(ctx context.Context, view *SavedView) error
	Delete(ctx context.Context, orgID string, id valuer.UUID) error
	List(ctx context.Context, orgID string, source Source, name string) ([]*SavedView, error)
}
