package core

import (
	"context"
	"database/sql"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
)

type store struct {
	store sqlstore.SQLStore
}

// NewStore creates a new SQLite store for quick filters
func NewStore(db sqlstore.SQLStore) quickfiltertypes.QuickFilterStore {
	return &store{store: db}
}

// GetOrgFilters retrieves all filters for an organization
func (s *store) GetOrgFilters(ctx context.Context, orgID string) ([]*quickfiltertypes.StorableOrgFilter, error) {
	filters := make([]*quickfiltertypes.StorableOrgFilter, 0)

	err := s.store.
		BunDB().
		NewSelect().
		Model(&filters).
		Where("org_id = ?", orgID).
		Order("signal ASC").
		Scan(ctx)

	if err != nil {
		return filters, err
	}

	return filters, nil
}

// GetSignalFilters retrieves filters for a specific signal in an organization
func (s *store) GetSignalFilters(ctx context.Context, orgID string, signal string) (*quickfiltertypes.StorableOrgFilter, error) {
	filter := new(quickfiltertypes.StorableOrgFilter)

	err := s.store.
		BunDB().
		NewSelect().
		Model(filter).
		Where("org_id = ?", orgID).
		Where("signal = ?", signal).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return filter, nil
}

// UpsertOrgFilter inserts or updates filters for an organization and signal
func (s *store) UpsertOrgFilter(ctx context.Context, filter *quickfiltertypes.StorableOrgFilter) error {
	_, err := s.store.
		BunDB().
		NewInsert().
		Model(filter).
		On("CONFLICT (id) DO UPDATE").
		Set("filter = EXCLUDED.filter").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)

	return err
}
