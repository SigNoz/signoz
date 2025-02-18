package auth

import (
	"context"
	"fmt"
	"time"

	"go.signoz.io/signoz/ee/query-service/app/api"
	baseauth "go.signoz.io/signoz/pkg/query-service/auth"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types/authtypes"

	"go.uber.org/zap"
)

func GetUserFromRequestContext(ctx context.Context, apiHandler *api.APIHandler) (*basemodel.UserPayload, error) {
	patToken, ok := authtypes.UUIDFromContext(ctx)
	if ok && patToken != "" {
		zap.L().Debug("Received a non-zero length PAT token")
		ctx := context.Background()
		dao := apiHandler.AppDao()

		pat, err := dao.GetPAT(ctx, patToken)
		if err == nil && pat != nil {
			zap.L().Debug("Found valid PAT: ", zap.Any("pat", pat))
			if pat.ExpiresAt < time.Now().Unix() && pat.ExpiresAt != 0 {
				zap.L().Info("PAT has expired: ", zap.Any("pat", pat))
				return nil, fmt.Errorf("PAT has expired")
			}
			group, apiErr := dao.GetGroupByName(ctx, pat.Role)
			if apiErr != nil {
				zap.L().Error("Error while getting group for PAT: ", zap.Any("apiErr", apiErr))
				return nil, apiErr
			}
			user, err := dao.GetUser(ctx, pat.UserID)
			if err != nil {
				zap.L().Error("Error while getting user for PAT: ", zap.Error(err))
				return nil, err
			}
			telemetry.GetInstance().SetPatTokenUser()
			dao.UpdatePATLastUsed(ctx, patToken, time.Now().Unix())
			user.User.GroupId = group.ID
			user.User.Id = pat.Id
			return &basemodel.UserPayload{
				User: user.User,
				Role: pat.Role,
			}, nil
		}
		if err != nil {
			zap.L().Error("Error while getting user for PAT: ", zap.Error(err))
			return nil, err
		}
	}
	return baseauth.GetUserFromReqContext(ctx)
}
