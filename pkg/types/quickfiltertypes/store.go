package quickfiltertypes

import (
	"context"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type QuickFilterStore interface {
	// Get retrieves all filters for an organization
	Get(ctx context.Context, orgID valuer.UUID) ([]*StorableQuickFilter, error)

	// GetBySignal retrieves filters for a specific signal in an organization
	GetBySignal(ctx context.Context, orgID valuer.UUID, signal string) (*StorableQuickFilter, error)

	// Upsert inserts or updates filters for an organization and signal
	Upsert(ctx context.Context, filter *StorableQuickFilter) error
	Create(ctx context.Context, filter []*StorableQuickFilter) error
}
