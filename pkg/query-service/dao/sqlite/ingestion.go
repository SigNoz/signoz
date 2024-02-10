package sqlite

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/model"
)

func (mds *ModelDaoSqlite) GetIngestionKeys(ctx context.Context) ([]model.IngestionKey, *model.ApiError) {
	ingestion_keys := []model.IngestionKey{}
	err := mds.db.Select(&ingestion_keys, `SELECT * FROM ingestion_keys`)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return ingestion_keys, nil
}

func (mds *ModelDaoSqlite) InsertIngestionKey(ctx context.Context, ingestion_key *model.IngestionKey) *model.ApiError {
	_, err := mds.db.ExecContext(ctx, `
	INSERT INTO ingestion_keys (
		ingestion_key,
		name,
		key_id,
		ingestion_url,
		data_region
	) VALUES (
		?,
		?,
		?,
		?,
		?
	)`, ingestion_key.IngestionKey, ingestion_key.Name, ingestion_key.KeyId, ingestion_key.IngestionURL, ingestion_key.DataRegion)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}
