package core

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(db sqlstore.SQLStore) preferencetypes.PreferenceStore {
	return &store{store: db}
}

func (store *store) GetOrgPreference(ctx context.Context, orgID string, preferenceID string) (*preferencetypes.StorableOrgPreference, error) {
	orgPreference := new(preferencetypes.StorableOrgPreference)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", preferenceID).
		Where("org_id = ?", orgID).
		Scan(ctx)

	if err != nil {
		return orgPreference, err
	}

	return orgPreference, nil
}

func (store *store) GetAllOrgPreferences(ctx context.Context, orgID string) ([]*preferencetypes.StorableOrgPreference, error) {
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

func (store *store) UpsertOrgPreference(ctx context.Context, orgPreference *preferencetypes.StorableOrgPreference) error {
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

func (store *store) GetUserPreference(ctx context.Context, userID string, preferenceID string) (*preferencetypes.StorableUserPreference, error) {
	userPreference := new(preferencetypes.StorableUserPreference)
	err := store.
		store.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("preference_id = ?", preferenceID).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return userPreference, err
	}

	return userPreference, nil
}

func (store *store) GetAllUserPreferences(ctx context.Context, userID string) ([]*preferencetypes.StorableUserPreference, error) {
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

func (store *store) UpsertUserPreference(ctx context.Context, userPreference *preferencetypes.StorableUserPreference) error {
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
