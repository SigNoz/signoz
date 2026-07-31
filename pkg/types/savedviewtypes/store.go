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

	// List returns the org's saved views, optionally filtered by sourcePage
	// (exact match) and name (substring). A zero-value sourcePage means "no
	// filter" -- it does not match a literal empty source_page column value.
	List(ctx context.Context, orgID string, sourcePage SourcePage, name string) ([]*SavedView, error)
}
