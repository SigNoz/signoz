package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/ee/types"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	ossTypes "github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"

	"go.uber.org/zap"
)

func (m *modelDao) CreatePAT(ctx context.Context, orgID string, p types.GettablePAT) (types.GettablePAT, basemodel.BaseApiError) {
	p.StorablePersonalAccessToken.OrgID = orgID
	p.StorablePersonalAccessToken.ID = valuer.GenerateUUID()
	_, err := m.DB().NewInsert().
		Model(&p.StorablePersonalAccessToken).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to insert PAT in db, err: %v", zap.Error(err))
		return types.GettablePAT{}, model.InternalError(fmt.Errorf("PAT insertion failed"))
	}

	createdByUser, _ := m.GetUser(ctx, p.UserID)
	if createdByUser == nil {
		p.CreatedByUser = types.PatUser{
			NotFound: true,
		}
	} else {
		p.CreatedByUser = types.PatUser{
			User: ossTypes.User{
				Identifiable: ossTypes.Identifiable{ID: createdByUser.ID},
				Name:         createdByUser.Name,
				Email:        createdByUser.Email,
				TimeAuditable: ossTypes.TimeAuditable{
					CreatedAt: createdByUser.CreatedAt,
					UpdatedAt: createdByUser.UpdatedAt,
				},
				ProfilePictureURL: createdByUser.ProfilePictureURL,
			},
			NotFound: false,
		}
	}
	return p, nil
}

func (m *modelDao) UpdatePAT(ctx context.Context, orgID string, p types.GettablePAT, id valuer.UUID) basemodel.BaseApiError {
	_, err := m.DB().NewUpdate().
		Model(&p.StorablePersonalAccessToken).
		Column("role", "name", "updated_at", "updated_by_user_id").
		Where("id = ?", id.StringValue()).
		Where("org_id = ?", orgID).
		Where("revoked = false").
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to update PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT update failed"))
	}
	return nil
}

func (m *modelDao) ListPATs(ctx context.Context, orgID string) ([]types.GettablePAT, basemodel.BaseApiError) {
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

	patsWithUsers := []types.GettablePAT{}
	for i := range pats {
		patWithUser := types.GettablePAT{
			StorablePersonalAccessToken: pats[i],
		}

		createdByUser, _ := m.GetUser(ctx, pats[i].UserID)
		if createdByUser == nil {
			patWithUser.CreatedByUser = types.PatUser{
				NotFound: true,
			}
		} else {
			patWithUser.CreatedByUser = types.PatUser{
				User: ossTypes.User{
					Identifiable: ossTypes.Identifiable{ID: createdByUser.ID},
					Name:         createdByUser.Name,
					Email:        createdByUser.Email,
					TimeAuditable: ossTypes.TimeAuditable{
						CreatedAt: createdByUser.CreatedAt,
						UpdatedAt: createdByUser.UpdatedAt,
					},
					ProfilePictureURL: createdByUser.ProfilePictureURL,
				},
				NotFound: false,
			}
		}

		updatedByUser, _ := m.GetUser(ctx, pats[i].UpdatedByUserID)
		if updatedByUser == nil {
			patWithUser.UpdatedByUser = types.PatUser{
				NotFound: true,
			}
		} else {
			patWithUser.UpdatedByUser = types.PatUser{
				User: ossTypes.User{
					Identifiable: ossTypes.Identifiable{ID: updatedByUser.ID},
					Name:         updatedByUser.Name,
					Email:        updatedByUser.Email,
					TimeAuditable: ossTypes.TimeAuditable{
						CreatedAt: updatedByUser.CreatedAt,
						UpdatedAt: updatedByUser.UpdatedAt,
					},
					ProfilePictureURL: updatedByUser.ProfilePictureURL,
				},
				NotFound: false,
			}
		}

		patsWithUsers = append(patsWithUsers, patWithUser)
	}
	return patsWithUsers, nil
}

func (m *modelDao) RevokePAT(ctx context.Context, orgID string, id valuer.UUID, userID string) basemodel.BaseApiError {
	updatedAt := time.Now().Unix()
	_, err := m.DB().NewUpdate().
		Model(&types.StorablePersonalAccessToken{}).
		Set("revoked = ?", true).
		Set("updated_by_user_id = ?", userID).
		Set("updated_at = ?", updatedAt).
		Where("id = ?", id.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Failed to revoke PAT in db, err: %v", zap.Error(err))
		return model.InternalError(fmt.Errorf("PAT revoke failed"))
	}
	return nil
}

func (m *modelDao) GetPAT(ctx context.Context, token string) (*types.GettablePAT, basemodel.BaseApiError) {
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

	patWithUser := types.GettablePAT{
		StorablePersonalAccessToken: pats[0],
	}

	return &patWithUser, nil
}

func (m *modelDao) GetPATByID(ctx context.Context, orgID string, id valuer.UUID) (*types.GettablePAT, basemodel.BaseApiError) {
	pats := []types.StorablePersonalAccessToken{}

	if err := m.DB().NewSelect().
		Model(&pats).
		Where("id = ?", id.StringValue()).
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

	patWithUser := types.GettablePAT{
		StorablePersonalAccessToken: pats[0],
	}

	return &patWithUser, nil
}

// deprecated
func (m *modelDao) GetUserByPAT(ctx context.Context, orgID string, token string) (*ossTypes.GettableUser, basemodel.BaseApiError) {
	users := []ossTypes.GettableUser{}

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
