package implpreference

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) preferencetypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) GetByOrg(ctx context.Context, orgID valuer.UUID, name preferencetypes.Name) (*preferencetypes.StorableOrgPreference, error) {
	orgPreference := new(preferencetypes.StorableOrgPreference)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(orgPreference).
		Where("preference_id = ?", name).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "preference with name %s not found", name)
	}

	return orgPreference, nil
}

func (store *store) ListByOrg(ctx context.Context, orgID valuer.UUID) ([]*preferencetypes.StorableOrgPreference, error) {
	orgPreferences := make([]*preferencetypes.StorableOrgPreference, 0)

	err := store.
		sqlstore.
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

func (store *store) UpsertByOrg(ctx context.Context, orgPreference *preferencetypes.StorableOrgPreference) error {
	_, err := store.
		sqlstore.
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
		sqlstore.
		BunDB().
		NewSelect().
		Model(userPreference).
		Where("preference_id = ?", name).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "preference with name %s not found", name)
	}

	return userPreference, nil
}

func (store *store) ListByUser(ctx context.Context, userID valuer.UUID) ([]*preferencetypes.StorableUserPreference, error) {
	userPreferences := make([]*preferencetypes.StorableUserPreference, 0)

	err := store.
		sqlstore.
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

func (store *store) UpsertByUser(ctx context.Context, userPreference *preferencetypes.StorableUserPreference) error {
	_, err := store.
		sqlstore.
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
