package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/model"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"go.uber.org/zap"
)

func (m *modelDao) CreatePAT(ctx context.Context, orgID string, p model.PAT) (model.PAT, basemodel.BaseApiError) {
	p.StorablePersonalAccessToken.OrgID = orgID
	_, err := m.DB().NewInsert().
		Model(&p.StorablePersonalAccessToken).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to insert PAT in db, err: %v", zap.Error(err))
		return model.PAT{}, model.InternalError(fmt.Errorf("PAT insertion failed"))
	}

	createdByUser, _ := m.GetUser(ctx, p.UserID)
	if createdByUser == nil {
		p.CreatedByUser = model.User{
			NotFound: true,
		}
	} else {
		p.CreatedByUser = model.User{
			Id:                createdByUser.ID,
			Name:              createdByUser.Name,
			Email:             createdByUser.Email,
			CreatedAt:         createdByUser.CreatedAt.Unix(),
			ProfilePictureURL: createdByUser.ProfilePictureURL,
			NotFound:          false,
		}
	}
	return p, nil
}

func (m *modelDao) UpdatePAT(ctx context.Context, orgID string, p model.PAT, id string) basemodel.BaseApiError {
	_, err := m.DB().NewUpdate().
		Model(&p.StorablePersonalAccessToken).
		Column("role", "name", "updated_at", "updated_by_user_id").
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("revoked = false").
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to update PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT update failed"))
	}
	return nil
}

func (m *modelDao) ListPATs(ctx context.Context, orgID string) ([]model.PAT, basemodel.BaseApiError) {
	pats := []types.StorablePersonalAccessToken{}

	if err := m.DB().NewSelect().
		Model(&pats).
		Where("revoked = false").
		Where("org_id = ?", orgID).
		Order("updated_at DESC").
		Scan(ctx); err != nil {
		zap.L().Error("Failed to fetch PATs err: %v", zap.Error(err))
		return nil, model.InternalError(fmt.Errorf("failed to fetch PATs"))
	}

	patsWithUsers := []model.PAT{}
	for i := range pats {
		patWithUser := model.PAT{
			StorablePersonalAccessToken: pats[i],
		}

		createdByUser, _ := m.GetUser(ctx, pats[i].UserID)
		if createdByUser == nil {
			patWithUser.CreatedByUser = model.User{
				NotFound: true,
			}
		} else {
			patWithUser.CreatedByUser = model.User{
				Id:                createdByUser.ID,
				Name:              createdByUser.Name,
				Email:             createdByUser.Email,
				CreatedAt:         createdByUser.CreatedAt.Unix(),
				ProfilePictureURL: createdByUser.ProfilePictureURL,
				NotFound:          false,
			}
		}

		updatedByUser, _ := m.GetUser(ctx, pats[i].UpdatedByUserID)
		if updatedByUser == nil {
			patWithUser.UpdatedByUser = model.User{
				NotFound: true,
			}
		} else {
			patWithUser.UpdatedByUser = model.User{
				Id:                updatedByUser.ID,
				Name:              updatedByUser.Name,
				Email:             updatedByUser.Email,
				CreatedAt:         updatedByUser.CreatedAt.Unix(),
				ProfilePictureURL: updatedByUser.ProfilePictureURL,
				NotFound:          false,
			}
		}

		patsWithUsers = append(patsWithUsers, patWithUser)
	}
	return patsWithUsers, nil
}

func (m *modelDao) RevokePAT(ctx context.Context, orgID string, id string, userID string) basemodel.BaseApiError {
	updatedAt := time.Now().Unix()
	_, err := m.DB().NewUpdate().
		Model(&types.StorablePersonalAccessToken{}).
		Set("revoked = ?", true).
		Set("updated_by_user_id = ?", userID).
		Set("updated_at = ?", updatedAt).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to revoke PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT revoke failed"))
	}
	return nil
}

func (m *modelDao) GetPAT(ctx context.Context, token string) (*model.PAT, basemodel.BaseApiError) {
	pats := []types.StorablePersonalAccessToken{}

	if err := m.DB().NewSelect().
		Model(&pats).
		Where("token = ?", token).
		Where("revoked = false").
		Scan(ctx); err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to fetch PAT"))
	}

	if len(pats) != 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: fmt.Errorf("found zero or multiple PATs with same token, %s", token),
		}
	}

	patWithUser := model.PAT{
		StorablePersonalAccessToken: pats[0],
	}

	return &patWithUser, nil
}

func (m *modelDao) GetPATByID(ctx context.Context, orgID string, id string) (*model.PAT, basemodel.BaseApiError) {
	pats := []types.StorablePersonalAccessToken{}

	if err := m.DB().NewSelect().
		Model(&pats).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("revoked = false").
		Scan(ctx); err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to fetch PAT"))
	}

	if len(pats) != 1 {
		return nil, &model.ApiError{
			Typ: model.ErrorInternal,
			Err: fmt.Errorf("found zero or multiple PATs with same token"),
		}
	}

	patWithUser := model.PAT{
		StorablePersonalAccessToken: pats[0],
	}

	return &patWithUser, nil
}

// deprecated
func (m *modelDao) GetUserByPAT(ctx context.Context, orgID string, token string) (*types.GettableUser, basemodel.BaseApiError) {
	users := []types.GettableUser{}

	if err := m.DB().NewSelect().
		Model(&users).
		Column("u.id", "u.name", "u.email", "u.password", "u.created_at", "u.profile_picture_url", "u.org_id", "u.group_id").
		Join("JOIN personal_access_tokens p ON u.id = p.user_id").
		Where("p.token = ?", token).
		Where("p.expires_at >= strftime('%s', 'now')").
		Where("p.org_id = ?", orgID).
		Scan(ctx); err != nil {
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
