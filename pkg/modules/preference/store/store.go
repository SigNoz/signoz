package store

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(db sqlstore.SQLStore) types.PreferenceStore {
	return &store{store: db}
}

func (store *store) GetOrgPreference(ctx context.Context, orgID string, preferenceID string) (*types.StorableOrgPreference, error) {
	orgPreference := new(types.StorableOrgPreference)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", preferenceID).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return orgPreference, nil
}

func (store *store) GetAllOrgPreferences(ctx context.Context, orgID string) ([]*types.StorableOrgPreference, error) {
	orgPreferences := make([]*types.StorableOrgPreference, 0)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(&orgPreferences).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return orgPreferences, nil
}

func (store *store) UpsertOrgPreference(ctx context.Context, orgPreference *types.StorableOrgPreference) error {
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

func (store *store) GetUserPreference(ctx context.Context, userID string, preferenceID string) (*types.StorableUserPreference, error) {
	userPreference := new(types.StorableUserPreference)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("preference_id = ?", preferenceID).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return userPreference, nil
}

func (store *store) GetAllUserPreferences(ctx context.Context, userID string) ([]*types.StorableUserPreference, error) {
	userPreferences := make([]*types.StorableUserPreference, 0)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(&userPreferences).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return userPreferences, nil
}

func (store *store) UpsertUserPreference(ctx context.Context, userPreference *types.StorableUserPreference) error {
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
