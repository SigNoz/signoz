package implpreference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(db sqlstore.SQLStore) preferencetypes.Store {
	return &store{store: db}
}

func (store *store) GetByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name) (*preferencetypes.StorableOrgPreference, error) {
	orgPreference := new(preferencetypes.StorableOrgPreference)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", name).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return orgPreference, err
	}

	return orgPreference, nil
}

func (store *store) ListByOrg(ctx context.Context, orgID valuer.UUID) ([]*preferencetypes.StorableOrgPreference, error) {
	orgPreferences := make([]*preferencetypes.StorableOrgPreference, 0)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(&orgPreferences).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return orgPreferences, err
	}

	return orgPreferences, nil
}

func (store *store) UpsertByOrg(ctx context.Context, orgPreference *preferencetypes.StorableOrgPreference) error {
	_, err := store.
		store.
		BunDB().
		NewInsert().
		Model(orgPreference).
		On("CONFLICT (id) DO UPDATE").
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) GetByUser(ctx context.Context, userID valuer.UUID, name preferencetypes.Name) (*preferencetypes.StorableUserPreference, error) {
	userPreference := new(preferencetypes.StorableUserPreference)

	err := store.
		store.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		return userPreference, err
	}

	return userPreference, nil
}

func (store *store) ListByUser(ctx context.Context, userID valuer.UUID) ([]*preferencetypes.StorableUserPreference, error) {
	userPreferences := make([]*preferencetypes.StorableUserPreference, 0)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(&userPreferences).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return userPreferences, err
	}

	return userPreferences, nil
}

func (store *store) UpsertByUser(ctx context.Context, userPreference *preferencetypes.StorableUserPreference) error {
	_, err := store.
		store.
		BunDB().
		NewInsert().
		Model(userPreference).
		On("CONFLICT (id) DO UPDATE").
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
