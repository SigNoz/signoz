package quickfiltertypes

import "context"

type QuickFilterStore interface {
	// GetOrgFilters retrieves all filters for an organization
	GetOrgFilters(ctx context.Context, orgID string) ([]*StorableOrgFilter, error)

	// GetSignalFilters retrieves filters for a specific signal in an organization
	GetSignalFilters(ctx context.Context, orgID string, signal string) (*StorableOrgFilter, error)

	// UpsertOrgFilter inserts or updates filters for an organization and signal
	UpsertOrgFilter(ctx context.Context, filter *StorableOrgFilter) error
}
