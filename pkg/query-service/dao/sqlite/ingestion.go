package sqlite

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
)

func (mds *ModelDaoSqlite) GetIngestionKeys(ctx context.Context) ([]types.IngestionKey, *model.ApiError) {
	ingestion_keys := []types.IngestionKey{}
	err := mds.bundb.NewSelect().
		Model(&ingestion_keys).
		Scan(ctx)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return ingestion_keys, nil
}

func (mds *ModelDaoSqlite) InsertIngestionKey(ctx context.Context, ingestion_key *types.IngestionKey) *model.ApiError {
	_, err := mds.bundb.NewInsert().
		Model(ingestion_key).
		Column("ingestion_key", "name", "key_id", "ingestion_url", "data_region").
		Exec(ctx)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}
