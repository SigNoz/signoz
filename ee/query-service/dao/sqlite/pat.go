package sqlite

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (m *modelDao) CreatePAT(ctx context.Context, p model.PAT) (model.PAT, basemodel.BaseApiError) {
	result, err := m.DB().ExecContext(ctx,
		"INSERT INTO personal_access_tokens (user_id, token, role, name, created_at, expires_at, updated_at, updated_by_user_id, last_used, revoked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		p.UserID,
		p.Token,
		p.Role,
		p.Name,
		p.CreatedAt,
		p.ExpiresAt,
		p.UpdatedAt,
		p.UpdatedByUserID,
		p.LastUsed,
		p.Revoked,
	)
	if err != nil {
		zap.L().Error("Failed to insert PAT in db, err: %v", zap.Error(err))
		return model.PAT{}, model.InternalError(fmt.Errorf("PAT insertion failed"))
	}
	id, err := result.LastInsertId()
	if err != nil {
		zap.L().Error("Failed to get last inserted id, err: %v", zap.Error(err))
		return model.PAT{}, model.InternalError(fmt.Errorf("PAT insertion failed"))
	}
	p.Id = strconv.Itoa(int(id))
	createdByUser, _ := m.GetUser(ctx, p.UserID)
	if createdByUser == nil {
		p.CreatedByUser = model.User{
			NotFound: true,
		}
	} else {
		p.CreatedByUser = model.User{
			Id:                createdByUser.Id,
			Name:              createdByUser.Name,
			Email:             createdByUser.Email,
			CreatedAt:         createdByUser.CreatedAt,
			ProfilePictureURL: createdByUser.ProfilePictureURL,
			NotFound:          false,
		}
	}
	return p, nil
}

func (m *modelDao) UpdatePAT(ctx context.Context, p model.PAT, id string) basemodel.BaseApiError {
	_, err := m.DB().ExecContext(ctx,
		"UPDATE personal_access_tokens SET role=$1, name=$2, updated_at=$3, updated_by_user_id=$4 WHERE id=$5 and revoked=false;",
		p.Role,
		p.Name,
		p.UpdatedAt,
		p.UpdatedByUserID,
		id)
	if err != nil {
		zap.L().Error("Failed to update PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT update failed"))
	}
	return nil
}

func (m *modelDao) UpdatePATLastUsed(ctx context.Context, token string, lastUsed int64) basemodel.BaseApiError {
	_, err := m.DB().ExecContext(ctx,
		"UPDATE personal_access_tokens SET last_used=$1 WHERE token=$2 and revoked=false;",
		lastUsed,
		token)
	if err != nil {
		zap.L().Error("Failed to update PAT last used in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT last used update failed"))
	}
	return nil
}

func (m *modelDao) ListPATs(ctx context.Context) ([]model.PAT, basemodel.BaseApiError) {
	pats := []model.PAT{}

	if err := m.DB().Select(&pats, "SELECT * FROM personal_access_tokens WHERE revoked=false ORDER by updated_at DESC;"); err != nil {
		zap.L().Error("Failed to fetch PATs err: %v", zap.Error(err))
		return nil, model.InternalError(fmt.Errorf("failed to fetch PATs"))
	}
	for i := range pats {
		createdByUser, _ := m.GetUser(ctx, pats[i].UserID)
		if createdByUser == nil {
			pats[i].CreatedByUser = model.User{
				NotFound: true,
			}
		} else {
			pats[i].CreatedByUser = model.User{
				Id:                createdByUser.Id,
				Name:              createdByUser.Name,
				Email:             createdByUser.Email,
				CreatedAt:         createdByUser.CreatedAt,
				ProfilePictureURL: createdByUser.ProfilePictureURL,
				NotFound:          false,
			}
		}

		updatedByUser, _ := m.GetUser(ctx, pats[i].UpdatedByUserID)
		if updatedByUser == nil {
			pats[i].UpdatedByUser = model.User{
				NotFound: true,
			}
		} else {
			pats[i].UpdatedByUser = model.User{
				Id:                updatedByUser.Id,
				Name:              updatedByUser.Name,
				Email:             updatedByUser.Email,
				CreatedAt:         updatedByUser.CreatedAt,
				ProfilePictureURL: updatedByUser.ProfilePictureURL,
				NotFound:          false,
			}
		}
	}
	return pats, nil
}

func (m *modelDao) RevokePAT(ctx context.Context, id string, userID string) basemodel.BaseApiError {
	updatedAt := time.Now().Unix()
	_, err := m.DB().ExecContext(ctx,
		"UPDATE personal_access_tokens SET revoked=true, updated_by_user_id = $1, updated_at=$2 WHERE id=$3",
		userID, updatedAt, id)
	if err != nil {
		zap.L().Error("Failed to revoke PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT revoke failed"))
	}
	return nil
}

func (m *modelDao) GetPAT(ctx context.Context, token string) (*model.PAT, basemodel.BaseApiError) {
	pats := []model.PAT{}

	if err := m.DB().Select(&pats, `SELECT * FROM personal_access_tokens WHERE token=? and revoked=false;`, token); err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to fetch PAT"))
	}

	if len(pats) != 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: fmt.Errorf("found zero or multiple PATs with same token, %s", token),
		}
	}

	return &pats[0], nil
}

func (m *modelDao) GetPATByID(ctx context.Context, id string) (*model.PAT, basemodel.BaseApiError) {
	pats := []model.PAT{}

	if err := m.DB().Select(&pats, `SELECT * FROM personal_access_tokens WHERE id=? and revoked=false;`, id); err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to fetch PAT"))
	}

	if len(pats) != 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: fmt.Errorf("found zero or multiple PATs with same token"),
		}
	}

	return &pats[0], nil
}

// deprecated
func (m *modelDao) GetUserByPAT(ctx context.Context, token string) (*basemodel.UserPayload, basemodel.BaseApiError) {
	users := []basemodel.UserPayload{}

	query := `SELECT
				u.id,
				u.name,
				u.email,
				u.password,
				u.created_at,
				u.profile_picture_url,
				u.org_id,
				u.group_id
			  FROM users u, personal_access_tokens p
			  WHERE u.id = p.user_id and p.token=? and p.expires_at >= strftime('%s', 'now');`

	if err := m.DB().Select(&users, query, token); err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to fetch user from PAT, err: %v", err))
	}

	if len(users) != 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: fmt.Errorf("found zero or multiple users with same PAT token"),
		}
	}
	return &users[0], nil
}
