package sqlite

import (
	"context"
	"fmt"

	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (m *modelDao) CreatePAT(ctx context.Context, p *model.PAT) basemodel.BaseApiError {
	_, err := m.DB().ExecContext(ctx,
		"INSERT INTO personal_access_tokens (user_id, token, name, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)",
		p.UserID,
		p.Token,
		p.Name,
		p.CreatedAt,
		p.ExpiresAt)
	if err != nil {
		zap.S().Errorf("Failed to insert PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT insertion failed"))
	}
	return nil
}

func (m *modelDao) ListPATs(ctx context.Context, userID string) ([]model.PAT, basemodel.BaseApiError) {
	pats := []model.PAT{}

	if err := m.DB().Select(&pats, `SELECT * FROM personal_access_tokens WHERE user_id=?;`, userID); err != nil {
		zap.S().Errorf("Failed to fetch PATs for user: %s, err: %v", userID, zap.Error(err))
		return nil, model.InternalError(fmt.Errorf("Failed to fetch PATs"))
	}
	return pats, nil
}

func (m *modelDao) DeletePAT(ctx context.Context, id string) basemodel.BaseApiError {
	_, err := m.DB().ExecContext(ctx, `DELETE from personal_access_tokens where id=?;`, id)
	if err != nil {
		zap.S().Errorf("Failed to delete PAT, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("Failed to delete PAT"))
	}
	return nil
}
