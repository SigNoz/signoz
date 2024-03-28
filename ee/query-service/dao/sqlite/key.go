package sqlite

import (
	"context"
	"fmt"

	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (m *modelDao) CreateKey(ctx context.Context, key *model.Key) basemodel.BaseApiError {
	result, err := m.DB().ExecContext(ctx,
		"INSERT INTO keys (id, name, value, created_at, expires_at, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
		key.Id,
		key.Name,
		key.Value,
		key.CreatedAt,
		key.ExpiresAt,
		key.CreatedBy,
	)
	if err != nil {
		zap.L().Error("Failed to insert key in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("key insertion failed"))
	}

	_, err = result.LastInsertId()
	if err != nil {
		zap.L().Error("Failed to get last inserted id, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("key insertion failed"))
	}

	return nil
}

func (m *modelDao) GetKeys(ctx context.Context) ([]*model.Key, basemodel.BaseApiError) {
	keys := []*model.Key{}

	if err := m.DB().Select(&keys, "SELECT * FROM keys ORDER by created_at DESC;"); err != nil {
		zap.L().Error("Failed to fetch keys err: %v", zap.Error(err))
		return nil, model.InternalError(fmt.Errorf("failed to fetch keys"))
	}
	for i := range keys {
		createdByUser, _ := m.GetUser(ctx, keys[i].CreatedBy)
		if createdByUser == nil {
			keys[i].CreatedByUser = model.User{
				NotFound: true,
			}
		} else {
			keys[i].CreatedByUser = model.User{
				Id:                createdByUser.Id,
				Name:              createdByUser.Name,
				Email:             createdByUser.Email,
				CreatedAt:         createdByUser.CreatedAt,
				ProfilePictureURL: createdByUser.ProfilePictureURL,
				NotFound:          false,
			}
		}
	}
	return keys, nil
}

func (m *modelDao) DeleteKey(ctx context.Context, id string) basemodel.BaseApiError {
	_, err := m.DB().ExecContext(
		ctx,
		"DELETE FROM keys WHERE id=$1",
		id,
	)
	if err != nil {
		zap.L().Error("Failed to delete key in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("key deletion failed"))
	}

	return nil
}
