package quickfiltertypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type QuickFilterStore interface {
	// Get retrieves all filters for an organization
	Get(ctx context.Context, orgID valuer.UUID) ([]*StorableQuickFilter, error)

	// GetBySource retrieves filters for a specific source in an organization
	GetBySource(ctx context.Context, orgID valuer.UUID, source string) (*StorableQuickFilter, error)

	// Upsert inserts or updates filters for an organization and source
	Upsert(ctx context.Context, filter *StorableQuickFilter) error
	Create(ctx context.Context, filter []*StorableQuickFilter) error
}
