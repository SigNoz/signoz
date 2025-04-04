package sqlfeaturecontrol

import (
	"context"
	databasesql "database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type sql struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) featuretypes.FeatureStore {
	return &sql{sqlstore: sqlstore}
}

func (store *sql) List(ctx context.Context) ([]*featuretypes.StorableFeature, error) {
	var features []*featuretypes.StorableFeature

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(features).
		Scan(ctx)
	if err != nil {
		if err == databasesql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, featuretypes.ErrCodeNoFeaturesFound, "no features found")
		}

		return nil, err
	}

	return features, nil
}

func (store *sql) Set(ctx context.Context, features ...featuretypes.StorableFeature) error {
	if _, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(features).
		On("CONFLICT (name) DO UPDATE").
		Set("default = EXCLUDED.default").
		Set("immutable = EXCLUDED.immutable").
		Set("stage = EXCLUDED.stage").
		Set("description = EXCLUDED.description").
		Set("kind = EXCLUDED.kind").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (store *sql) GetOrgFeatures(ctx context.Context, orgID valuer.UUID) ([]*featuretypes.StorableOrgFeature, error) {
	return nil, nil
}

func (store *sql) SetOrgFeature(ctx context.Context, diff map[featuretypes.Action][]*featuretypes.StorableOrgFeature) error {
	return nil
}
